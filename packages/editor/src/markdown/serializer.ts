import type { Mark, Node as ProseMirrorNode } from "prosemirror-model";
import { collectInlineFeatures, collectMarkDelims } from "../features/index.ts";

type MarkSpec = {
  open: string | ((state: State, mark: Mark, parent: ProseMirrorNode, index: number) => string);
  close: string | ((state: State, mark: Mark, parent: ProseMirrorNode, index: number) => string);
  expelEnclosingWhitespace?: boolean;
  escape?: boolean;
};

const markSpecs: Record<string, MarkSpec> = collectMarkDelims() as Record<string, MarkSpec>;
const markRank = new Map(Object.keys(markSpecs).map((name, index) => [name, index]));

function sortMarks(marks: readonly Mark[]): Mark[] {
  return [...marks].sort(
    (a, b) => (markRank.get(a.type.name) ?? 99) - (markRank.get(b.type.name) ?? 99),
  );
}

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
    state.text(node.textContent, false);
    state.write("\n");
    state.write(fence);
    state.closeBlock(node);
  },
  heading(state, node) {
    state.write(`${"#".repeat(node.attrs.level)} `);
    state.renderInline(node, false);
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
    state.text(node.text ?? "", !state.inAutolink);
  },
};

class State {
  out = "";
  delim = "";
  closed: ProseMirrorNode | null = null;
  inTightList = false;
  inAutolink = false;
  atBlockStart = false;

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

  text(text: string, escape = true) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      this.write();
      if (!escape && lines[i][0] === "[" && /(^|[^\\])!$/.test(this.out)) {
        this.out = `${this.out.slice(0, -1)}\\!`;
      }
      this.out += escape ? this.esc(lines[i], this.atBlockStart) : lines[i];
      if (i !== lines.length - 1) this.out += "\n";
    }
  }

  esc(str: string, startOfLine = false) {
    let result = str.replace(/[`*\\~[\]_]/g, (m, i) => {
      if (
        m === "_" &&
        i > 0 &&
        i + 1 < str.length &&
        /\w/.test(str[i - 1]) &&
        /\w/.test(str[i + 1])
      ) {
        return m;
      }
      return `\\${m}`;
    });
    if (startOfLine) {
      result = result
        .replace(/^(\+[ ]|[-*>])/, "\\$&")
        .replace(/^(\s*)(#{1,6})(\s|$)/, "$1\\$2$3")
        .replace(/^(\s*\d+)\.\s/, "$1\\. ");
    }
    return result;
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

  renderInline(parent: ProseMirrorNode, fromBlockStart = true) {
    this.atBlockStart = fromBlockStart;
    let active: Mark[] = [];
    let trailing = "";
    const inlineSourceRanges = collectInlineFeatures().flatMap(
      (feature) =>
        feature.extRanges?.(parent).map(([from, to]) => ({
          from,
          to,
          markNames: feature.markNames,
        })) ?? [],
    );
    const sourceRanges = inlineSourceRanges.map(({ from, to }) => ({ from, to }));

    const progress = (node: ProseMirrorNode | null, offset: number, index: number) => {
      let marks = node ? sortMarks(node.marks) : [];
      if (node?.isText) {
        const textNode = node;
        marks = marks.filter(
          (mark) => !isInlineSourceMark(inlineSourceRanges, offset, textNode.nodeSize, mark),
        );
      }

      if (node && node.type.name === "hard_break") {
        marks = marks.filter((mark) => {
          if (index + 1 === parent.childCount) return false;
          const next = parent.child(index + 1);
          return mark.isInSet(next.marks) && (!next.isText || /\S/.test(next.text ?? ""));
        });
      }

      let leading = trailing;
      trailing = "";

      if (
        node &&
        node.isText &&
        marks.some((m) => markSpecs[m.type.name]?.expelEnclosingWhitespace && !m.isInSet(active))
      ) {
        const match = /^(\s*)(.*)$/m.exec(node.text ?? "");
        const lead = match?.[1] ?? "";
        const rest = match?.[2] ?? "";
        if (lead) {
          leading += lead;
          node = rest
            ? (node as ProseMirrorNode & { withText(t: string): ProseMirrorNode }).withText(rest)
            : null;
          if (!node) marks = active;
        }
      }

      if (
        node &&
        node.isText &&
        marks.some(
          (m) =>
            markSpecs[m.type.name]?.expelEnclosingWhitespace && !isMarkAhead(parent, index + 1, m),
        )
      ) {
        const match = /^(.*?)(\s*)$/m.exec(node.text ?? "");
        const rest = match?.[1] ?? "";
        const trail = match?.[2] ?? "";
        if (trail) {
          trailing = trail;
          node = rest
            ? (node as ProseMirrorNode & { withText(t: string): ProseMirrorNode }).withText(rest)
            : null;
          if (!node) marks = active;
        }
      }

      const inner = marks.length ? marks[marks.length - 1] : null;
      const sourceRange = node?.isText
        ? sourceRanges.some((range) => offset >= range.from && offset < range.to)
        : false;
      const noEsc = inner ? markSpecs[inner.type.name]?.escape === false : false;
      const len = marks.length - (noEsc ? 1 : 0);

      let keep = 0;
      while (keep < Math.min(active.length, len) && marks[keep].eq(active[keep])) keep += 1;

      while (keep < active.length) {
        this.text(markString(this, active.pop()!, false, parent, index), false);
      }

      if (leading) this.text(leading);

      if (node) {
        while (active.length < len) {
          const add = marks[active.length];
          active.push(add);
          this.text(markString(this, add, true, parent, index), false);
          this.atBlockStart = false;
        }
        if (sourceRange && node.isText) {
          this.text(node.text ?? "", false);
        } else if (noEsc && node.isText) {
          this.text(
            markString(this, inner!, true, parent, index) +
              (node.text ?? "") +
              markString(this, inner!, false, parent, index + 1),
            false,
          );
        } else {
          this.render(node, parent, index);
        }
        this.atBlockStart = false;
      }
    };

    parent.forEach(progress);
    progress(null, 0, parent.childCount);
    if (trailing) this.text(trailing);
    this.atBlockStart = false;
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

function markString(
  state: State,
  mark: Mark,
  open: boolean,
  parent: ProseMirrorNode,
  index: number,
): string {
  const spec = markSpecs[mark.type.name];
  if (!spec) return "";
  const value = open ? spec.open : spec.close;
  return typeof value === "string" ? value : value(state, mark, parent, index);
}

function isMarkAhead(parent: ProseMirrorNode, index: number, mark: Mark): boolean {
  for (let i = index; i < parent.childCount; i += 1) {
    const next = parent.child(i);
    if (next.type.name !== "hard_break") return mark.isInSet(next.marks);
  }
  return false;
}

function isInlineSourceMark(
  ranges: Array<{ from: number; to: number; markNames: string[] }>,
  offset: number,
  size: number,
  mark: Mark,
): boolean {
  return ranges.some(
    (range) =>
      range.markNames.includes(mark.type.name) && offset >= range.from && offset + size <= range.to,
  );
}

export const markdownSerializer = {
  serialize(content: ProseMirrorNode): string {
    const state = new State();
    state.renderContent(content);
    return state.out;
  },
};
