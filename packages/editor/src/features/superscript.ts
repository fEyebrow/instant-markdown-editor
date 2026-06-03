import type { MarkSpec } from "prosemirror-model";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import { markExtRanges, scanFixedDelim } from "./inline-parse.ts";
import type { FeatureSpec } from "./_types.ts";

export const superscriptMarkSpecs = {
  superscript: {
    parseDOM: [{ tag: "sup" }],
    toDOM() {
      return ["sup"];
    },
  } as MarkSpec,
};

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

export const superscript: FeatureSpec = {
  name: "superscript",
  marks: superscriptMarkSpecs,
  parserTokens: {
    sup_open: (state, _token, schema) => {
      state.addText("^");
      state.openMark(schema.marks.superscript.create());
    },
    sup_close: (state, _token, schema) => {
      state.closeMarkType(schema.marks.superscript);
      state.addText("^");
    },
  },
  mdItPlugins: [
    (tokenizer) => tokenizer.inline.ruler.before("emphasis", "superscript", superscriptRule),
  ],
  inline: {
    priority: 1.3,
    markNames: ["superscript"],
    scan: (text, consumed) => scanFixedDelim(text, "^", 1, "superscript", consumed),
    extRanges: (parent) => markExtRanges(parent, "superscript", 1),
  },
};
