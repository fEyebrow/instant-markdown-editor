import {
  markConsumed,
  markExtRanges,
  scanFixedDelim,
  scanRuns,
  type InlineFeatureSpec,
  type InlineSpan,
} from "./inline-parse.ts";

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
    if (b === -1) b = runs.findIndex((_, index) => index > a && !used.has(index));
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

function scanEmphasis(text: string, consumed: Uint8Array): InlineSpan[] {
  const spans: InlineSpan[] = [];
  scanOneEmphasisDelimiter(text, "*", consumed, spans);
  scanOneEmphasisDelimiter(text, "_", consumed, spans);
  return spans;
}

function scanOneEmphasisDelimiter(
  text: string,
  delimiter: string,
  consumed: Uint8Array,
  spans: InlineSpan[],
): void {
  scanEmphasisLength(text, delimiter, consumed, spans, 2, "strong");
  scanEmphasisLength(text, delimiter, consumed, spans, 1, "em");
}

function scanEmphasisLength(
  text: string,
  delimiter: string,
  consumed: Uint8Array,
  spans: InlineSpan[],
  delimiterLength: 1 | 2,
  type: "em" | "strong",
): void {
  const runs = scanRuns(text, delimiter, consumed).filter((run) => run.len >= delimiterLength);
  const stack: number[] = [];
  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i]!;
    if (run.canClose && stack.length) {
      const open = runs[stack.pop()!]!;
      const openFrom = open.pos;
      const openTo = openFrom + delimiterLength;
      const closeTo = run.pos + run.len;
      const closeFrom = closeTo - delimiterLength;
      if (openTo >= closeFrom) continue;
      if (/\s/.test(text[openTo]!) || /\s/.test(text[closeFrom - 1]!)) continue;

      markConsumed(consumed, openFrom, openTo);
      markConsumed(consumed, closeFrom, closeTo);
      spans.push({ type, from: openTo, to: closeFrom, openFrom, openTo, closeFrom, closeTo });
      continue;
    }
    if (run.canOpen) {
      stack.push(i);
    }
  }
}

export const inlineCodeFeature: InlineFeatureSpec = {
  priority: 0,
  markNames: ["code"],
  scan: scanCode,
  extRanges: (parent) => markExtRanges(parent, "code", 1),
};

export const inlineStrikeFeature: InlineFeatureSpec = {
  priority: 1,
  markNames: ["strikethrough"],
  scan: (text, consumed) => scanFixedDelim(text, "~", 2, "strikethrough", consumed),
  extRanges: (parent) => markExtRanges(parent, "strikethrough", 2),
};

export const inlineSubscriptFeature: InlineFeatureSpec = {
  priority: 1.2,
  markNames: ["subscript"],
  scan: (text, consumed) => scanFixedDelim(text, "~", 1, "subscript", consumed),
  extRanges: (parent) => markExtRanges(parent, "subscript", 1),
};

export const inlineSuperscriptFeature: InlineFeatureSpec = {
  priority: 1.3,
  markNames: ["superscript"],
  scan: (text, consumed) => scanFixedDelim(text, "^", 1, "superscript", consumed),
  extRanges: (parent) => markExtRanges(parent, "superscript", 1),
};

export const inlineHighlightFeature: InlineFeatureSpec = {
  priority: 1.5,
  markNames: ["highlight"],
  scan: (text, consumed) => scanFixedDelim(text, "=", 2, "highlight", consumed),
  extRanges: (parent) => markExtRanges(parent, "highlight", 2),
};

export const inlineEmphasisFeature: InlineFeatureSpec = {
  priority: 2,
  markNames: ["em", "strong"],
  scan: scanEmphasis,
  extRanges: (parent) => [...markExtRanges(parent, "em", 1), ...markExtRanges(parent, "strong", 2)],
};

export const inlineFeatureSpecs: InlineFeatureSpec[] = [
  inlineCodeFeature,
  inlineStrikeFeature,
  inlineSubscriptFeature,
  inlineSuperscriptFeature,
  inlineHighlightFeature,
  inlineEmphasisFeature,
];
