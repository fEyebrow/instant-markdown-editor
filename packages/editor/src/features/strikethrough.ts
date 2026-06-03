import type { MarkSpec } from "prosemirror-model";
import { markExtRanges, scanFixedDelim } from "./inline-parse.ts";
import type { FeatureSpec } from "./_types.ts";

export const strikethroughMarkSpecs = {
  strikethrough: {
    parseDOM: [{ tag: "s" }, { tag: "del" }, { tag: "strike" }],
    toDOM() {
      return ["s"];
    },
  } as MarkSpec,
};

export const strikethrough: FeatureSpec = {
  name: "strikethrough",
  marks: strikethroughMarkSpecs,
  parserTokens: {
    s_open: (state, _token, schema) => {
      state.addText("~~");
      state.openMark(schema.marks.strikethrough.create());
    },
    s_close: (state, _token, schema) => {
      state.closeMarkType(schema.marks.strikethrough);
      state.addText("~~");
    },
  },
  mdItPlugins: [(tokenizer) => tokenizer.enable("strikethrough")],
  inline: {
    priority: 1,
    markNames: ["strikethrough"],
    scan: (text, consumed) => scanFixedDelim(text, "~", 2, "strikethrough", consumed),
    extRanges: (parent) => markExtRanges(parent, "strikethrough", 2),
  },
};
