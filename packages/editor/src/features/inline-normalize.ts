import type { Mark, Node as PMNode, Schema } from "prosemirror-model";
import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import { syntaxHintsPlugin } from "./inline-decorations.ts";
import { parseInline, type InlineSpan } from "./inline-parse.ts";
import { inlineFeatureSpecs } from "./inline-scanners.ts";

export type DelimRange = {
  from: number;
  to: number;
  spanFrom: number;
  spanTo: number;
  forceVisible?: boolean;
  forceHidden?: boolean;
  softInside?: boolean;
  className?: string;
};

export type NormalizeInlineState = {
  blocks: Array<{ blockPos: number; blockStart: number; spans: InlineSpan[] }>;
  delims: DelimRange[];
};

export const normalizeInlineKey = new PluginKey<NormalizeInlineState>("normalize-inline");

export function createInlineNormalizePlugins(schema: Schema): Plugin[] {
  return [normalizeInlinePlugin(schema), syntaxHintsPlugin()];
}

export function normalizeInlinePlugin(schema: Schema): Plugin<NormalizeInlineState> {
  return new Plugin<NormalizeInlineState>({
    key: normalizeInlineKey,
    state: {
      init: (_, state) => computePlan(state.doc),
      apply: (tr, previous, _oldState, newState) =>
        tr.docChanged ? computePlan(newState.doc) : previous,
    },
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((tr) => tr.docChanged)) return null;

      const plan = normalizeInlineKey.getState(newState);
      if (!plan) return null;

      const markTypes = inlineFeatureSpecs
        .flatMap((feature) => feature.markNames)
        .map((name) => schema.marks[name])
        .filter((mark): mark is NonNullable<typeof mark> => Boolean(mark));
      const tr = newState.tr;
      let changed = false;

      for (const block of plan.blocks) {
        const blockNode = newState.doc.nodeAt(block.blockPos);
        if (!blockNode?.isTextblock) continue;
        const blockEnd = block.blockStart + blockNode.content.size;
        const size = blockNode.content.size;

        for (const markType of markTypes) {
          const target = Array.from<Mark | null>({ length: size }).fill(null);
          for (const span of block.spans) {
            if (span.type !== markType.name) continue;
            const mark = markType.create(span.attrs);
            for (let i = span.from; i < span.to; i += 1) target[i] = mark;
          }

          const current = Array.from<Mark | null>({ length: size }).fill(null);
          let offset = 0;
          blockNode.content.forEach((child) => {
            const mark = child.marks.find((candidate) => candidate.type === markType) ?? null;
            for (let i = 0; i < child.nodeSize; i += 1) current[offset + i] = mark;
            offset += child.nodeSize;
          });

          let same = true;
          for (let i = 0; i < size; i += 1) {
            const a = target[i];
            const b = current[i];
            if (a === b || (a && b && a.eq(b))) continue;
            same = false;
            break;
          }
          if (same) continue;

          tr.removeMark(block.blockStart, blockEnd, markType);
          for (const span of block.spans) {
            if (span.type !== markType.name) continue;
            tr.addMark(
              block.blockStart + span.from,
              block.blockStart + span.to,
              markType.create(span.attrs),
            );
          }
          changed = true;
        }
      }

      return changed ? tr : null;
    },
  });
}

export function getDelims(state: EditorState): DelimRange[] {
  return normalizeInlineKey.getState(state)?.delims ?? [];
}

function computePlan(doc: PMNode): NormalizeInlineState {
  const blocks: NormalizeInlineState["blocks"] = [];
  const delims: DelimRange[] = [];

  doc.descendants((node, pos, parent) => {
    if (!node.isTextblock) return true;

    const blockStart = pos + 1;
    const spans = parseInline(node.textContent, parent);
    blocks.push({ blockPos: pos, blockStart, spans });

    for (const span of spans) {
      const spanFrom = blockStart + span.openFrom;
      const spanTo = blockStart + span.closeTo;
      const ranges = span.delimRanges ?? [
        { from: span.openFrom, to: span.openTo },
        { from: span.closeFrom, to: span.closeTo },
      ];
      for (const range of ranges) {
        delims.push({
          from: blockStart + range.from,
          to: blockStart + range.to,
          spanFrom,
          spanTo,
          forceVisible: range.forceVisible,
          forceHidden: range.forceHidden,
          softInside: range.softInside,
          className: range.className,
        });
      }
    }

    return false;
  });

  return { blocks, delims };
}
