import type { MarkSpec } from "prosemirror-model";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import { markExtRanges, scanFixedDelim } from "./inline-parse.ts";
import type { FeatureSpec } from "./_types.ts";

export const subscriptMarkSpecs = {
  subscript: {
    parseDOM: [{ tag: "sub" }],
    toDOM() {
      return ["sub"];
    },
  } as MarkSpec,
};

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

export const subscript: FeatureSpec = {
  name: "subscript",
  marks: subscriptMarkSpecs,
  parserTokens: {
    sub_open: (state, _token, schema) => {
      state.addText("~");
      state.openMark(schema.marks.subscript.create());
    },
    sub_close: (state, _token, schema) => {
      state.closeMarkType(schema.marks.subscript);
      state.addText("~");
    },
  },
  mdItPlugins: [
    (tokenizer) => tokenizer.inline.ruler.before("emphasis", "subscript", subscriptRule),
  ],
  inline: {
    priority: 1.2,
    markNames: ["subscript"],
    scan: (text, consumed) => scanFixedDelim(text, "~", 1, "subscript", consumed),
    extRanges: (parent) => markExtRanges(parent, "subscript", 1),
  },
};
