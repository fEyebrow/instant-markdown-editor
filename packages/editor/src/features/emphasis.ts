import type { MarkSpec } from "prosemirror-model";
import {
  markConsumed,
  markExtRanges,
  scanRuns,
  type InlineFeatureSpec,
  type InlineSpan,
} from "./inline-parse.ts";
import type { FeatureSpec } from "./_types.ts";

const isAlnum = (c: string): boolean => /[A-Za-z0-9]/.test(c);

function scanOneEmphasisDelimiter(
  text: string,
  delimiter: string,
  consumed: Uint8Array,
  spans: InlineSpan[],
): void {
  const runs = scanRuns(text, delimiter, consumed);
  if (delimiter === "_") {
    for (const run of runs) {
      const before = run.pos > 0 ? text[run.pos - 1]! : " ";
      const after = run.pos + run.len < text.length ? text[run.pos + run.len]! : " ";
      if (isAlnum(before)) run.canOpen = false;
      if (isAlnum(after)) run.canClose = false;
    }
  }
  const stack: number[] = [];
  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i]!;
    if (run.canClose && stack.length) {
      const openIndex = stack.pop()!;
      const open = runs[openIndex]!;
      if (delimiter === "*" && open.len === 1 && run.len >= 3 && stack.length) {
        const outer = runs[stack[stack.length - 1]!]!;
        if (outer.len >= 2) {
          stack.pop();
          const emOpenFrom = open.pos;
          const emOpenTo = emOpenFrom + 1;
          const emCloseFrom = run.pos;
          const emCloseTo = emCloseFrom + 1;
          const strongOpenFrom = outer.pos;
          const strongOpenTo = strongOpenFrom + 2;
          const strongCloseFrom = emCloseTo;
          const strongCloseTo = strongCloseFrom + 2;
          if (emOpenTo < emCloseFrom && strongOpenTo < strongCloseFrom) {
            markConsumed(consumed, strongOpenFrom, strongOpenTo);
            markConsumed(consumed, emOpenFrom, emOpenTo);
            markConsumed(consumed, emCloseFrom, strongCloseTo);
            spans.push({
              type: "strong",
              from: strongOpenTo,
              to: strongCloseFrom,
              openFrom: strongOpenFrom,
              openTo: strongOpenTo,
              closeFrom: strongCloseFrom,
              closeTo: strongCloseTo,
            });
            spans.push({
              type: "em",
              from: emOpenTo,
              to: emCloseFrom,
              openFrom: emOpenFrom,
              openTo: emOpenTo,
              closeFrom: emCloseFrom,
              closeTo: emCloseTo,
            });
            continue;
          }
        }
      }

      if (open.len >= 3 && run.len >= 3) {
        const emOpenFrom = open.pos;
        const emOpenTo = emOpenFrom + 1;
        const emCloseTo = run.pos + run.len;
        const emCloseFrom = emCloseTo - 1;
        const strongOpenFrom = emOpenTo;
        const strongOpenTo = strongOpenFrom + 2;
        const strongCloseTo = emCloseFrom;
        const strongCloseFrom = strongCloseTo - 2;
        const innerFrom = strongOpenTo;
        const innerTo = strongCloseFrom;
        if (innerFrom >= innerTo) continue;
        if (/\s/.test(text[innerFrom]!) || /\s/.test(text[innerTo - 1]!)) continue;

        markConsumed(consumed, emOpenFrom, emCloseTo);
        spans.push({
          type: "em",
          from: emOpenTo,
          to: emCloseFrom,
          openFrom: emOpenFrom,
          openTo: emOpenTo,
          closeFrom: emCloseFrom,
          closeTo: emCloseTo,
        });
        spans.push({
          type: "strong",
          from: innerFrom,
          to: innerTo,
          openFrom: strongOpenFrom,
          openTo: strongOpenTo,
          closeFrom: strongCloseFrom,
          closeTo: strongCloseTo,
        });
        continue;
      }

      const delimiterLength = Math.min(open.len, run.len) >= 2 ? 2 : 1;
      const openFrom = open.pos;
      const openTo = openFrom + delimiterLength;
      const closeTo = run.pos + run.len;
      const closeFrom = closeTo - delimiterLength;
      if (openTo >= closeFrom) continue;
      if (/\s/.test(text[openTo]!) || /\s/.test(text[closeFrom - 1]!)) continue;

      markConsumed(consumed, openFrom, openTo);
      markConsumed(consumed, closeFrom, closeTo);
      spans.push({
        type: delimiterLength === 2 ? "strong" : "em",
        from: openTo,
        to: closeFrom,
        openFrom,
        openTo,
        closeFrom,
        closeTo,
      });
      continue;
    }
    if (run.canOpen) stack.push(i);
  }
}

const scan: InlineFeatureSpec["scan"] = (text, consumed) => {
  const out: InlineSpan[] = [];
  scanOneEmphasisDelimiter(text, "*", consumed, out);
  scanOneEmphasisDelimiter(text, "_", consumed, out);
  return out;
};

export const emphasis: FeatureSpec = {
  name: "emphasis",

  marks: {
    em: {
      parseDOM: [
        { tag: "i" },
        { tag: "em" },
        { style: "font-style=italic" },
        { style: "font-style=normal", clearMark: (mark) => mark.type.name === "em" },
      ],
      toDOM() {
        return ["em"];
      },
    } as MarkSpec,

    strong: {
      parseDOM: [
        { tag: "strong" },
        {
          tag: "b",
          getAttrs: (node) => (node as HTMLElement).style.fontWeight !== "normal" && null,
        },
        { style: "font-weight=400", clearMark: (mark) => mark.type.name === "strong" },
        {
          style: "font-weight",
          getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
        },
      ],
      toDOM() {
        return ["strong"];
      },
    } as MarkSpec,
  },

  parserTokens: {
    em_open: (state, token, schema) => {
      state.addText(token.markup || "*");
      state.openMark(schema.marks.em.create());
    },
    em_close: (state, token, schema) => {
      state.closeMarkType(schema.marks.em);
      state.addText(token.markup || "*");
    },
    strong_open: (state, token, schema) => {
      state.addText(token.markup || "**");
      state.openMark(schema.marks.strong.create());
    },
    strong_close: (state, token, schema) => {
      state.closeMarkType(schema.marks.strong);
      state.addText(token.markup || "**");
    },
  },

  markDelims: {
    em: { open: "", close: "" },
    strong: { open: "", close: "" },
  },

  inline: {
    priority: 2,
    markNames: ["em", "strong"],
    scan,
    extRanges: (parent) => [
      ...markExtRanges(parent, "em", 1),
      ...markExtRanges(parent, "strong", 2),
    ],
  },
};
