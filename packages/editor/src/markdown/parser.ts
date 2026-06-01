import MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type Token from "markdown-it/lib/token.mjs";
import {
  type Attrs,
  Mark,
  type MarkType,
  Node as ProseMirrorNode,
  type NodeType,
  type Schema,
} from "prosemirror-model";
import { featureMarkdownParseSpecs } from "../features/index.ts";
import { lookupShortcode } from "../features/emoji-catalog.ts";
import { editorSchema } from "../schema/index.ts";

type TokenHandler = (state: ParseState, token: Token, tokens: Token[], i: number) => void;

interface StackFrame {
  type: NodeType;
  attrs: Attrs | null;
  content: ProseMirrorNode[];
  marks: readonly Mark[];
}

class ParseState {
  stack: StackFrame[];

  constructor(
    readonly schema: Schema,
    readonly handlers: Record<string, TokenHandler>,
  ) {
    this.stack = [{ type: schema.topNodeType, attrs: null, content: [], marks: Mark.none }];
  }

  top(): StackFrame {
    return this.stack[this.stack.length - 1];
  }

  push(node: ProseMirrorNode) {
    if (this.stack.length) this.top().content.push(node);
  }

  addText(text: string) {
    if (!text) return;
    const top = this.top();
    const nodes = top.content;
    const last = nodes[nodes.length - 1];
    const node = this.schema.text(text, top.marks);
    if (last?.isText && Mark.sameSet(last.marks, node.marks)) {
      nodes[nodes.length - 1] = (
        last as ProseMirrorNode & { withText(t: string): ProseMirrorNode }
      ).withText((last.text ?? "") + (node.text ?? ""));
    } else {
      nodes.push(node);
    }
  }

  openMark(mark: Mark) {
    const top = this.top();
    top.marks = mark.addToSet(top.marks);
  }

  closeMark(mark: MarkType) {
    const top = this.top();
    top.marks = mark.removeFromSet(top.marks);
  }

  parseTokens(tokens: Token[]) {
    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];
      const handler = this.handlers[tok.type];
      if (!handler) throw new Error(`Token type \`${tok.type}\` not supported by Markdown parser`);
      handler(this, tok, tokens, i);
    }
  }

  addNode(type: NodeType, attrs: Attrs | null, content?: readonly ProseMirrorNode[]) {
    const top = this.top();
    const node = type.createAndFill(attrs, content, top ? top.marks : []);
    if (!node) return null;
    this.push(node);
    return node;
  }

  openNode(type: NodeType, attrs: Attrs | null) {
    this.stack.push({ type, attrs, content: [], marks: Mark.none });
  }

  closeNode() {
    const info = this.stack.pop();
    if (!info) return null;
    return this.addNode(info.type, info.attrs, info.content);
  }
}

type ParseSpec =
  | {
      block: string;
      getAttrs?: (tok: Token, toks: Token[], i: number) => Attrs | null;
      noCloseToken?: boolean;
    }
  | { node: string; getAttrs?: (tok: Token, toks: Token[], i: number) => Attrs | null }
  | {
      mark: string;
      getAttrs?: (tok: Token, toks: Token[], i: number) => Attrs | null;
      noCloseToken?: boolean;
    }
  | { ignore: true; noCloseToken?: boolean };

function getAttrs(spec: ParseSpec, tok: Token, toks: Token[], i: number): Attrs | null {
  return "getAttrs" in spec && spec.getAttrs ? spec.getAttrs(tok, toks, i) : null;
}

function isInlineCodeToken(spec: ParseSpec, type: string): boolean {
  return (
    ("noCloseToken" in spec && spec.noCloseToken === true) ||
    type === "code_inline" ||
    type === "code_block" ||
    type === "fence"
  );
}

function stripTrailingNewline(s: string): string {
  return s.endsWith("\n") ? s.slice(0, -1) : s;
}

function listIsTight(tokens: readonly Token[], i: number): boolean {
  for (let j = i + 1; j < tokens.length; j += 1) {
    if (tokens[j].type !== "list_item_open") return Boolean(tokens[j].hidden);
  }
  return false;
}

function buildHandlers(
  schema: Schema,
  specs: Record<string, ParseSpec>,
): Record<string, TokenHandler> {
  const handlers: Record<string, TokenHandler> = Object.create(null);

  for (const type of Object.keys(specs)) {
    const spec = specs[type];

    if ("block" in spec) {
      const nodeType = schema.nodes[spec.block];
      if (isInlineCodeToken(spec, type)) {
        handlers[type] = (state, tok, toks, i) => {
          state.openNode(nodeType, getAttrs(spec, tok, toks, i));
          state.addText(stripTrailingNewline(tok.content));
          state.closeNode();
        };
      } else {
        handlers[`${type}_open`] = (state, tok, toks, i) =>
          state.openNode(nodeType, getAttrs(spec, tok, toks, i));
        handlers[`${type}_close`] = (state) => {
          state.closeNode();
        };
      }
    } else if ("node" in spec) {
      const nodeType = schema.nodes[spec.node];
      handlers[type] = (state, tok, toks, i) =>
        state.addNode(nodeType, getAttrs(spec, tok, toks, i));
    } else if ("mark" in spec) {
      const markType = schema.marks[spec.mark];
      if (isInlineCodeToken(spec, type)) {
        handlers[type] = (state, tok, toks, i) => {
          state.openMark(markType.create(getAttrs(spec, tok, toks, i)));
          state.addText(stripTrailingNewline(tok.content));
          state.closeMark(markType);
        };
      } else {
        handlers[`${type}_open`] = (state, tok, toks, i) =>
          state.openMark(markType.create(getAttrs(spec, tok, toks, i)));
        handlers[`${type}_close`] = (state) => state.closeMark(markType);
      }
    } else if ("ignore" in spec) {
      const noop = () => {};
      if (isInlineCodeToken(spec, type)) {
        handlers[type] = noop;
      } else {
        handlers[`${type}_open`] = noop;
        handlers[`${type}_close`] = noop;
      }
    }
  }

  handlers.text = (state, tok) => state.addText(tok.content);
  handlers.inline = (state, tok) => {
    if (tok.children) state.parseTokens(tok.children);
  };
  handlers.softbreak = (state) => state.addText(" ");

  return handlers;
}

function highlightRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  if (!state.src.startsWith("==", start)) return false;

  const end = state.src.indexOf("==", start + 2);
  if (end === -1) return false;

  const inner = state.src.slice(start + 2, end);
  if (inner.trim() === "" || inner.includes("\n")) return false;

  if (!silent) {
    state.push("mark_open", "mark", 1).markup = "==";
    const token = state.push("text", "", 0);
    token.content = inner;
    state.push("mark_close", "mark", -1).markup = "==";
  }
  state.pos = end + 2;
  return true;
}

function subscriptRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  if (state.src[start] !== "~" || state.src[start + 1] === "~" || state.src[start - 1] === "~") {
    return false;
  }

  const end = state.src.indexOf("~", start + 1);
  if (end === -1 || state.src[end + 1] === "~") return false;

  const inner = state.src.slice(start + 1, end);
  if (inner.trim() === "" || inner.includes("\n")) return false;

  if (!silent) {
    state.push("sub_open", "sub", 1).markup = "~";
    const token = state.push("text", "", 0);
    token.content = inner;
    state.push("sub_close", "sub", -1).markup = "~";
  }
  state.pos = end + 1;
  return true;
}

function emojiRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  if (state.src[start] !== ":") return false;

  const end = state.src.indexOf(":", start + 1);
  if (end === -1) return false;

  const name = state.src.slice(start + 1, end);
  if (!/^[\w]+$/.test(name)) return false;

  const entry = lookupShortcode(name);
  if (!entry) return false;

  if (!silent) {
    const token = state.push("emoji", "span", 0);
    token.attrSet("data-shortcode", name);
    token.attrSet("data-emoji", entry.emoji);
    token.content = name;
  }
  state.pos = end + 1;
  return true;
}

function superscriptRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  if (state.src[start] !== "^") return false;

  const end = state.src.indexOf("^", start + 1);
  if (end === -1) return false;

  const inner = state.src.slice(start + 1, end);
  if (inner.trim() === "" || inner.includes("\n")) return false;

  if (!silent) {
    state.push("sup_open", "sup", 1).markup = "^";
    const token = state.push("text", "", 0);
    token.content = inner;
    state.push("sup_close", "sup", -1).markup = "^";
  }
  state.pos = end + 1;
  return true;
}

const tokenizer = MarkdownIt("commonmark", { html: false });
tokenizer.inline.ruler.before("emphasis", "highlight", highlightRule);
tokenizer.inline.ruler.before("emphasis", "subscript", subscriptRule);
tokenizer.inline.ruler.before("emphasis", "superscript", superscriptRule);
tokenizer.inline.ruler.before("emphasis", "emoji", emojiRule);
tokenizer.enable("strikethrough");
tokenizer.core.ruler.push("task_list", (coreState) => {
  for (let i = 0; i < coreState.tokens.length; i++) {
    const tok = coreState.tokens[i];
    if (tok.type !== "list_item_open") continue;
    for (let j = i + 1; j < coreState.tokens.length; j++) {
      const t = coreState.tokens[j];
      if (t.type === "list_item_close") break;
      if (t.type !== "inline" || !t.children) continue;
      const first = t.children[0];
      if (!first || first.type !== "text") break;
      const taskMatch = /^\[([ xX])\]( ?)/.exec(first.content);
      if (!taskMatch) break;
      tok.attrSet("data-task", "");
      if (taskMatch[1] !== " ") tok.attrSet("data-checked", "");
      first.content = first.content.slice(3 + taskMatch[2].length);
      if (!first.content) t.children.shift();
      break;
    }
  }
  return false;
});

const tokenSpecs: Record<string, ParseSpec> = {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: {
    block: "bullet_list",
    getAttrs: (_tok, toks, i) => ({ tight: listIsTight(toks, i) }),
  },
  ordered_list: {
    block: "ordered_list",
    getAttrs: (tok, toks, i) => ({
      order: Number(tok.attrGet("start")) || 1,
      tight: listIsTight(toks, i),
    }),
  },
  heading: { block: "heading", getAttrs: (tok) => ({ level: Number(tok.tag.slice(1)) }) },
  code_block: { block: "code_block", noCloseToken: true },
  fence: {
    block: "code_block",
    getAttrs: (tok) => ({ params: tok.info || "" }),
    noCloseToken: true,
  },
  hr: { node: "horizontal_rule" },
  image: {
    node: "image",
    getAttrs: (tok) => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") || null,
      alt: tok.children?.[0]?.content || null,
    }),
  },
  hardbreak: { node: "hard_break" },
  emoji: {
    node: "emoji",
    getAttrs: (tok) => ({
      shortcode: tok.attrGet("data-shortcode"),
      emoji: tok.attrGet("data-emoji"),
    }),
  },

  ...featureMarkdownParseSpecs,
  strong: { mark: "strong" },
  link: {
    mark: "link",
    getAttrs: (tok) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") || null,
    }),
  },
  code_inline: { mark: "code", noCloseToken: true },
};

const handlers = buildHandlers(editorSchema, tokenSpecs);

handlers.em_open = (state, tok) => {
  state.addText(tok.markup || "*");
  state.openMark(editorSchema.marks.em.create());
};
handlers.em_close = (state, tok) => {
  state.closeMark(editorSchema.marks.em);
  state.addText(tok.markup || "*");
};
handlers.strong_open = (state, tok) => {
  state.addText(tok.markup || "**");
  state.openMark(editorSchema.marks.strong.create());
};
handlers.strong_close = (state, tok) => {
  state.closeMark(editorSchema.marks.strong);
  state.addText(tok.markup || "**");
};
handlers.s_open = (state) => {
  state.addText("~~");
  state.openMark(editorSchema.marks.strikethrough.create());
};
handlers.s_close = (state) => {
  state.closeMark(editorSchema.marks.strikethrough);
  state.addText("~~");
};
handlers.mark_open = (state) => {
  state.addText("==");
  state.openMark(editorSchema.marks.highlight.create());
};
handlers.mark_close = (state) => {
  state.closeMark(editorSchema.marks.highlight);
  state.addText("==");
};
handlers.sub_open = (state) => {
  state.addText("~");
  state.openMark(editorSchema.marks.subscript.create());
};
handlers.sub_close = (state) => {
  state.closeMark(editorSchema.marks.subscript);
  state.addText("~");
};
handlers.sup_open = (state) => {
  state.addText("^");
  state.openMark(editorSchema.marks.superscript.create());
};
handlers.sup_close = (state) => {
  state.closeMark(editorSchema.marks.superscript);
  state.addText("^");
};
handlers.code_inline = (state, tok) => {
  const markup = tok.markup || "`";
  state.addText(markup);
  state.openMark(editorSchema.marks.code.create());
  state.addText(stripTrailingNewline(tok.content));
  state.closeMark(editorSchema.marks.code);
  state.addText(markup);
};

const origListItemOpen = handlers["list_item_open"];
handlers["list_item_open"] = (state, tok, toks, i) => {
  if (tok.attrGet("data-task") !== null) {
    state.openNode(editorSchema.nodes.task_item, {
      checked: tok.attrGet("data-checked") !== null,
    });
  } else {
    origListItemOpen(state, tok, toks, i);
  }
};

export const markdownParser = {
  parse(text: string): ProseMirrorNode {
    const state = new ParseState(editorSchema, handlers);
    state.parseTokens(tokenizer.parse(text, {}));
    let doc: ProseMirrorNode | null = null;
    do {
      doc = state.closeNode();
    } while (state.stack.length);
    return doc ?? editorSchema.topNodeType.createAndFill()!;
  },
};
