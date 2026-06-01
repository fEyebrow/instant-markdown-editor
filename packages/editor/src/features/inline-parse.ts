import type { Node as PMNode } from "prosemirror-model";
import { collectInlineFeatures } from "./index.ts";

export type InlineSpan = {
  type: string;
  from: number;
  to: number;
  openFrom: number;
  openTo: number;
  closeFrom: number;
  closeTo: number;
  attrs?: Record<string, unknown>;
  delimRanges?: Array<{
    from: number;
    to: number;
    forceVisible?: boolean;
    forceHidden?: boolean;
    softInside?: boolean;
    className?: string;
  }>;
};

export type InlineFeatureSpec = {
  priority: number;
  markNames: string[];
  scan: (text: string, consumed: Uint8Array, parent?: PMNode | null) => InlineSpan[];
  extRanges?: (parent: PMNode) => Array<[number, number]>;
};

export type Run = { pos: number; len: number; canOpen: boolean; canClose: boolean };

export function scanRuns(text: string, delim: string, consumed: Uint8Array): Run[] {
  const runs: Run[] = [];
  for (let i = 0; i < text.length; ) {
    if (text[i] !== delim || consumed[i]) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < text.length && text[j] === delim && !consumed[j]) j += 1;
    const before = i > 0 ? text[i - 1]! : " ";
    const after = j < text.length ? text[j]! : " ";
    runs.push({
      pos: i,
      len: j - i,
      canOpen: !/\s/.test(after),
      canClose: !/\s/.test(before),
    });
    i = j;
  }
  return runs;
}

export function markConsumed(consumed: Uint8Array, from: number, to: number): void {
  for (let i = from; i < to; i += 1) consumed[i] = 1;
}

export function scanFixedDelim(
  text: string,
  delimCh: string,
  delimLen: number,
  type: string,
  consumed: Uint8Array,
): InlineSpan[] {
  const out: InlineSpan[] = [];
  const runs = scanRuns(text, delimCh, consumed).filter((run) => run.len >= delimLen);
  const used = new Set<number>();

  for (let a = 0; a < runs.length; a += 1) {
    if (used.has(a)) continue;
    const open = runs[a]!;
    if (!open.canOpen) continue;

    let b = -1;
    for (let k = runs.length - 1; k > a; k -= 1) {
      if (!used.has(k) && runs[k]!.canClose) {
        b = k;
        break;
      }
    }
    if (b === -1) continue;

    const close = runs[b]!;
    const openFrom = open.pos;
    const openTo = openFrom + delimLen;
    const closeTo = close.pos + close.len;
    const closeFrom = closeTo - delimLen;
    const innerFrom = openTo;
    const innerTo = closeFrom;
    if (innerFrom >= innerTo) continue;
    if (/\s/.test(text[innerFrom]!) || /\s/.test(text[innerTo - 1]!)) continue;

    let hasDelimInside = false;
    for (let k = innerFrom; k < innerTo; k += 1) {
      if (text[k] === delimCh) {
        hasDelimInside = true;
        break;
      }
    }
    if (hasDelimInside) continue;

    markConsumed(consumed, openFrom, openTo);
    markConsumed(consumed, closeFrom, closeTo);
    used.add(a);
    used.add(b);
    out.push({ type, from: innerFrom, to: innerTo, openFrom, openTo, closeFrom, closeTo });
  }

  return out;
}

export function markExtRanges(
  parent: PMNode,
  markName: string,
  openLen: number,
  closeLen = openLen,
): Array<[number, number]> {
  const markType = parent.type.schema.marks[markName];
  if (!markType) return [];

  const ranges: Array<[number, number]> = [];
  let start = -1;
  let offset = 0;
  parent.forEach((child) => {
    if (child.isText) {
      const hasMark = child.marks.some((mark) => mark.type === markType);
      if (hasMark && start < 0) start = offset;
      if (!hasMark && start >= 0) {
        ranges.push([start - openLen, offset + closeLen]);
        start = -1;
      }
    }
    offset += child.nodeSize;
  });
  if (start >= 0) ranges.push([start - openLen, offset + closeLen]);
  return ranges;
}

export function parseInline(text: string, parent?: PMNode | null): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const consumed = new Uint8Array(text.length);
  for (const feature of collectInlineFeatures()) {
    const next = feature
      .scan(text, consumed, parent)
      .filter((span) => !spans.some((existing) => crosses(existing, span)));
    spans.push(...next);
  }
  return spans;
}

function crosses(a: InlineSpan, b: InlineSpan): boolean {
  const aFrom = a.openFrom;
  const aTo = a.closeTo;
  const bFrom = b.openFrom;
  const bTo = b.closeTo;

  const disjoint = aTo <= bFrom || bTo <= aFrom;
  const aContainsB = aFrom <= bFrom && bTo <= aTo;
  const bContainsA = bFrom <= aFrom && aTo <= bTo;
  return !disjoint && !aContainsB && !bContainsA;
}
