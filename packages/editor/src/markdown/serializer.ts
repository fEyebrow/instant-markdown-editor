import type { Node as ProseMirrorNode } from "prosemirror-model";

type NodeRenderer = (
  state: State,
  node: ProseMirrorNode,
  parent: ProseMirrorNode,
  index: number,
) => void;

const nodeRenderers: Record<string, NodeRenderer> = {
  blockquote(state, node) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node));
  },
  code_block(state, node) {
    const matches = node.textContent.match(/`{3,}/gm);
    const fence = matches ? matches.sort().slice(-1)[0] + "`" : "```";
    state.write(`${fence}${node.attrs.params || ""}\n`);
    state.text(node.textContent);
    state.write("\n");
    state.write(fence);
    state.closeBlock(node);
  },
  heading(state, node) {
    state.write(`${"#".repeat(node.attrs.level)} `);
    state.renderInline(node);
    state.closeBlock(node);
  },
  horizontal_rule(state, node) {
    state.write(node.attrs.markup || "---");
    state.closeBlock(node);
  },
  bullet_list(state, node) {
    state.renderList(node, "  ", () => {
      const bullet = (node.attrs.bullet as string | undefined) || "*";
      return `${bullet} `;
    });
  },
  ordered_list(state, node) {
    const start = (node.attrs.order as number) || 1;
    const maxW = String(start + node.childCount - 1).length;
    const space = " ".repeat(maxW + 2);
    state.renderList(node, space, (i) => {
      const nStr = String(start + i);
      return `${" ".repeat(maxW - nStr.length)}${nStr}. `;
    });
  },
  list_item(state, node) {
    state.renderContent(node);
  },
  paragraph(state, node) {
    state.renderInline(node);
    state.closeBlock(node);
  },
  hard_break(state, node, parent, index) {
    for (let i = index + 1; i < parent.childCount; i += 1) {
      if (parent.child(i).type !== node.type) {
        state.write("\\\n");
        return;
      }
    }
  },
  text(state, node) {
    state.text(node.text ?? "");
  },
};

class State {
  out = "";
  delim = "";
  closed: ProseMirrorNode | null = null;
  inTightList = false;

  flushClose(size = 2) {
    if (!this.closed) return;
    if (!this.atBlank()) this.out += "\n";
    if (size > 1) {
      let delimMin = this.delim;
      const trim = /\s+$/.exec(delimMin);
      if (trim) delimMin = delimMin.slice(0, delimMin.length - trim[0].length);
      for (let i = 1; i < size; i += 1) this.out += `${delimMin}\n`;
    }
    this.closed = null;
  }

  atBlank() {
    return /(^|\n)$/.test(this.out);
  }

  write(content?: string) {
    this.flushClose();
    if (this.delim && this.atBlank()) this.out += this.delim;
    if (content) this.out += content;
  }

  closeBlock(node: ProseMirrorNode) {
    this.closed = node;
  }

  text(text: string) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      this.write();
      this.out += lines[i];
      if (i !== lines.length - 1) this.out += "\n";
    }
  }

  wrapBlock(delim: string, firstDelim: string | null, node: ProseMirrorNode, f: () => void) {
    const old = this.delim;
    this.write(firstDelim ?? delim);
    this.delim += delim;
    f();
    this.delim = old;
    this.closeBlock(node);
  }

  render(node: ProseMirrorNode, parent: ProseMirrorNode, index: number) {
    const renderer = nodeRenderers[node.type.name];
    if (!renderer) throw new Error(`No markdown renderer for node \`${node.type.name}\``);
    renderer(this, node, parent, index);
  }

  renderContent(parent: ProseMirrorNode) {
    parent.forEach((node, _, i) => this.render(node, parent, i));
  }

  renderInline(parent: ProseMirrorNode) {
    parent.forEach((node, _, index) => {
      if (node.isText) this.text(node.text ?? "");
      else this.render(node, parent, index);
    });
  }

  renderList(node: ProseMirrorNode, delim: string, firstDelim: (i: number) => string) {
    if (this.closed && this.closed.type === node.type) this.flushClose(3);
    else if (this.inTightList) this.flushClose(1);

    const isTight = typeof node.attrs.tight !== "undefined" ? !!node.attrs.tight : this.inTightList;
    const prevTight = this.inTightList;
    this.inTightList = isTight;
    node.forEach((child, _, i) => {
      if (i && isTight) this.flushClose(1);
      this.wrapBlock(delim, firstDelim(i), node, () => this.render(child, node, i));
    });
    this.inTightList = prevTight;
  }
}

export const markdownSerializer = {
  serialize(content: ProseMirrorNode): string {
    const state = new State();
    state.renderContent(content);
    return state.out;
  },
};
