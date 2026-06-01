import type { MarkSpec } from "prosemirror-model";
import { markConsumed, markExtRanges, type InlineSpan } from "./inline-parse.ts";
import type { FeatureSpec } from "./_types.ts";

function scanCode(text: string, consumed: Uint8Array): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const runs: Array<{ pos: number; len: number }> = [];
  for (let i = 0; i < text.length; ) {
    if (text[i] !== "`" || consumed[i]) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < text.length && text[j] === "`" && !consumed[j]) j += 1;
    runs.push({ pos: i, len: j - i });
    i = j;
  }

  const used = new Set<number>();
  for (let a = 0; a < runs.length; a += 1) {
    if (used.has(a)) continue;
    const open = runs[a]!;
    let b = runs.findIndex((run, index) => index > a && !used.has(index) && run.len === open.len);
    if (b === -1) b = runs.findIndex((_run, index) => index > a && !used.has(index));
    if (b === -1) continue;

    const close = runs[b]!;
    const fenceLen = Math.min(open.len, close.len);
    const openFrom = open.pos;
    const openTo = openFrom + fenceLen;
    const closeTo = close.pos + close.len;
    const closeFrom = closeTo - fenceLen;
    if (openTo >= closeFrom || !/\S/.test(text.slice(openTo, closeFrom))) continue;

    markConsumed(consumed, openFrom, closeTo);
    used.add(a);
    used.add(b);
    spans.push({ type: "code", from: openTo, to: closeFrom, openFrom, openTo, closeFrom, closeTo });
  }
  return spans;
}

export const code: FeatureSpec = {
  name: "code",
  marks: {
    code: {
      code: true,
      parseDOM: [{ tag: "code" }],
      toDOM() {
        return ["code"];
      },
    } as MarkSpec,
  },
  parserTokens: {
    code_inline: (state, token, schema) => {
      const markup = token.markup || "`";
      state.addText(markup);
      state.openMark(schema.marks.code.create());
      state.addText(token.content.endsWith("\n") ? token.content.slice(0, -1) : token.content);
      state.closeMarkType(schema.marks.code);
      state.addText(markup);
    },
  },
  markDelims: {
    code: { open: "", close: "", escape: false },
  },
  inline: {
    priority: 0,
    markNames: ["code"],
    scan: scanCode,
    extRanges: (parent) => markExtRanges(parent, "code", 1),
  },
};
