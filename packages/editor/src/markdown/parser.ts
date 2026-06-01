import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import {
  type Attrs,
  Mark,
  type MarkType,
  Node as ProseMirrorNode,
  type NodeType,
  type Schema,
} from "prosemirror-model";
import { configureFeatureMarkdownIt, collectParserTokens } from "../features/index.ts";
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

  closeMarkType(mark: MarkType) {
    this.closeMark(mark);
  }

  topMark(mark: MarkType): Mark | null {
    const marks = this.top().marks;
    for (let i = marks.length - 1; i >= 0; i -= 1) {
      if (marks[i]!.type === mark) return marks[i]!;
    }
    return null;
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

const tokenizer = MarkdownIt("commonmark", { html: false });
configureFeatureMarkdownIt(tokenizer);

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
  hardbreak: { node: "hard_break" },
};

const handlers = buildHandlers(editorSchema, tokenSpecs);

for (const [tokenType, handler] of Object.entries(collectParserTokens())) {
  handlers[tokenType] = (state, token) => handler(state, token, editorSchema);
}

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
