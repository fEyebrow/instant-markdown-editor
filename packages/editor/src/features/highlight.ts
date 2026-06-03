import type { MarkSpec } from "prosemirror-model";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import { markExtRanges, scanFixedDelim } from "./inline-parse.ts";
import type { FeatureSpec } from "./_types.ts";

export const highlightMarkSpecs = {
  highlight: {
    parseDOM: [{ tag: "mark" }],
    toDOM() {
      return ["mark"];
    },
  } as MarkSpec,
};

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

export const highlight: FeatureSpec = {
  name: "highlight",
  marks: highlightMarkSpecs,
  parserTokens: {
    mark_open: (state, _token, schema) => {
      state.addText("==");
      state.openMark(schema.marks.highlight.create());
    },
    mark_close: (state, _token, schema) => {
      state.closeMarkType(schema.marks.highlight);
      state.addText("==");
    },
  },
  mdItPlugins: [
    (tokenizer) => tokenizer.inline.ruler.before("emphasis", "highlight", highlightRule),
  ],
  inline: {
    priority: 1.5,
    markNames: ["highlight"],
    scan: (text, consumed) => scanFixedDelim(text, "=", 2, "highlight", consumed),
    extRanges: (parent) => markExtRanges(parent, "highlight", 2),
  },
};
