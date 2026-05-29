import { Mark, type MarkType, type Node, type Schema } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Plugin, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export interface LiveInlineMarkSpec {
  mark: string;
  delimiter: string;
  liveClass: string;
  allowDelimiterFallback?: boolean;
  moveTypedTextAfterStartBoundary?: boolean;
  revealOnArrow?: boolean;
}

interface LiveInlineMarkConfig {
  mark: string;
  open: string;
  close: string;
  liveClass: string;
  allowDelimiterFallback: boolean;
}

interface LiveInlineMarkEntry {
  config: LiveInlineMarkConfig;
  mark: MarkType;
}

interface SourceLayer {
  id: string;
  config: LiveInlineMarkConfig;
  mark: MarkType;
  from: number;
  to: number;
  openFrom: number;
  openTo: number;
  innerFrom: number;
  innerTo: number;
  closeFrom: number;
  closeTo: number;
}

interface CommittedLayer {
  config: LiveInlineMarkConfig;
  mark: MarkType;
  from: number;
  to: number;
  marks: readonly Mark[];
  touch: "left-boundary" | "inside" | "right-boundary";
}

interface InvalidSourceLayer {
  layer: SourceLayer;
}

interface SelectionPath {
  pos: number;
  boundary: "outside" | "open-delimiter" | "content" | "close-delimiter";
}

interface ResolvedInlineSourceState {
  sourceLayers: SourceLayer[];
  committedCandidates: CommittedLayer[];
  selectionPath: SelectionPath;
  activeLayer: SourceLayer | null;
  sourceProjectionTarget: SourceLayer | null;
  reenterTarget: CommittedLayer | null;
  commitTarget: SourceLayer | null;
  invalidTargets: InvalidSourceLayer[];
}

export function createLiveInlineMarkFeatures(
  schema: Schema,
  specs: readonly LiveInlineMarkSpec[],
): Plugin[] {
  const entries = specs
    .map((spec) => {
      const mark = schema.marks[spec.mark];
      return mark ? { config: liveInlineMarkConfig(spec), mark } : null;
    })
    .filter((entry): entry is LiveInlineMarkEntry => Boolean(entry));

  return [liveInlineMarkController(entries)];
}

function liveInlineMarkConfig(spec: LiveInlineMarkSpec): LiveInlineMarkConfig {
  return {
    mark: spec.mark,
    open: spec.delimiter,
    close: spec.delimiter,
    liveClass: spec.liveClass,
    allowDelimiterFallback: spec.allowDelimiterFallback ?? false,
  };
}

function liveInlineMarkController(entries: readonly LiveInlineMarkEntry[]): Plugin {
  return new Plugin({
    props: {
      decorations(state) {
        return DecorationSet.create(state.doc, inlineMarkDecorations(state, entries));
      },
    },
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((tr) => tr.docChanged || tr.selectionSet)) return null;
      const resolved = resolveInlineSourceState(newState, entries);
      return applyResolverTarget(newState, resolved);
    },
  });
}

function resolveInlineSourceState(
  state: EditorState,
  entries: readonly LiveInlineMarkEntry[],
): ResolvedInlineSourceState {
  const selectionPath = selectionPathFor(state, []);
  if (!state.selection.empty) {
    return emptyResolvedState(selectionPath);
  }

  const sourceLayers = sourceLayersInSelectionTextblock(state, entries);
  const committedCandidates = committedCandidatesAtSelection(state, entries, sourceLayers);
  const activeLayer = activeSourceLayer(sourceLayers, state.selection.from);
  const invalidTargets = invalidSourceLayersAtSelection(state, entries, sourceLayers);
  const commitTarget = invalidTargets.length
    ? null
    : commitTargetFor(state, sourceLayers, activeLayer);
  const sourceProjectionTarget =
    invalidTargets.length || commitTarget
      ? null
      : (sourceLayers.find((layer) => !rangeHasMark(state.doc, layer)) ?? null);

  return {
    sourceLayers,
    committedCandidates,
    selectionPath: selectionPathFor(state, sourceLayers),
    activeLayer,
    sourceProjectionTarget,
    reenterTarget: invalidTargets.length || activeLayer ? null : (committedCandidates[0] ?? null),
    commitTarget,
    invalidTargets,
  };
}

function emptyResolvedState(selectionPath: SelectionPath): ResolvedInlineSourceState {
  return {
    sourceLayers: [],
    committedCandidates: [],
    selectionPath,
    activeLayer: null,
    sourceProjectionTarget: null,
    reenterTarget: null,
    commitTarget: null,
    invalidTargets: [],
  };
}

function applyResolverTarget(
  state: EditorState,
  resolved: ResolvedInlineSourceState,
): Transaction | null {
  if (resolved.invalidTargets[0]) return invalidateSourceLayer(state, resolved.invalidTargets[0]);
  if (resolved.sourceProjectionTarget) {
    return enterSourceProjection(state, resolved.sourceProjectionTarget);
  }
  if (resolved.commitTarget) return commitSourceLayer(state, resolved.commitTarget);
  if (resolved.reenterTarget) return reenterCommittedLayer(state, resolved.reenterTarget);
  return null;
}

function sourceLayersInSelectionTextblock(
  state: EditorState,
  entries: readonly LiveInlineMarkEntry[],
): SourceLayer[] {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return [];

  const blockStart = $from.start();
  const text = $from.parent.textBetween(0, $from.parent.content.size, "\n", "\ufffc");
  const layers: SourceLayer[] = [];

  for (const entry of entries) {
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const openAt = text.indexOf(entry.config.open, searchFrom);
      if (openAt === -1) break;

      const innerFrom = openAt + entry.config.open.length;
      const closeAt = text.indexOf(entry.config.close, innerFrom);
      if (closeAt === -1) break;

      const innerTo = closeAt;
      const closeTo = closeAt + entry.config.close.length;
      const inner = text.slice(innerFrom, innerTo);
      if (
        inner.trim().length > 0 &&
        !inner.includes("\n") &&
        (entry.config.mark === "code" ||
          !rangeHasMarkName($from.parent, openAt, closeTo - openAt, "code")) &&
        !isDelimiterFallback(text, entry.config, openAt, closeTo)
      ) {
        layers.push({
          id: `${entry.config.mark}@${blockStart + openAt}-${blockStart + closeTo}`,
          config: entry.config,
          mark: entry.mark,
          from: blockStart + openAt,
          to: blockStart + closeTo,
          openFrom: blockStart + openAt,
          openTo: blockStart + innerFrom,
          innerFrom: blockStart + innerFrom,
          innerTo: blockStart + innerTo,
          closeFrom: blockStart + closeAt,
          closeTo: blockStart + closeTo,
        });
      }
      searchFrom = Math.max(closeTo, openAt + 1);
    }
  }

  return layers.sort((a, b) => a.from - b.from || b.to - a.to);
}

function isDelimiterFallback(
  text: string,
  config: LiveInlineMarkConfig,
  openAt: number,
  closeTo: number,
): boolean {
  if (config.allowDelimiterFallback) return false;
  const delimiterChar = config.open[0];
  return text[openAt - 1] === delimiterChar || text[closeTo] === delimiterChar;
}

function activeSourceLayer(layers: readonly SourceLayer[], pos: number): SourceLayer | null {
  return (
    layers.find((layer) => pos >= layer.openFrom && pos <= layer.closeTo) ??
    layers.find((layer) => pos > layer.from && pos < layer.to) ??
    null
  );
}

function commitTargetFor(
  state: EditorState,
  layers: readonly SourceLayer[],
  activeLayer: SourceLayer | null,
): SourceLayer | null {
  const pos = state.selection.from;
  const trailingLayer = layers.find((layer) => {
    if (pos <= layer.closeTo) return false;
    const between = textBetween(state.doc, layer.closeTo, pos);
    return between.length > 0 && !onlyDelimiterChars(between, layer.config);
  });
  if (trailingLayer) return trailingLayer;

  if (!activeLayer) return null;
  if (pos < activeLayer.from || pos > activeLayer.to) return activeLayer;
  return null;
}

function onlyDelimiterChars(text: string, config: LiveInlineMarkConfig): boolean {
  return Array.from(text).every(
    (char) => config.open.includes(char) || config.close.includes(char),
  );
}

function committedCandidatesAtSelection(
  state: EditorState,
  entries: readonly LiveInlineMarkEntry[],
  sourceLayers: readonly SourceLayer[],
): CommittedLayer[] {
  const pos = state.selection.from;
  if (sourceLayers.some((layer) => pos >= layer.from && pos <= layer.to)) return [];

  return entries.flatMap(({ config, mark }) => committedMarkAt(state, config, mark, pos));
}

function committedMarkAt(
  state: EditorState,
  config: LiveInlineMarkConfig,
  mark: MarkType,
  pos: number,
): CommittedLayer[] {
  if (config.mark === "code") return [];
  const $pos = state.doc.resolve(pos);
  if (!$pos.parent.isTextblock) return [];
  const blockStart = $pos.start();
  const offset = pos - blockStart;
  const ranges = markRanges($pos.parent, mark).filter(
    (range) => offset >= range.from && offset <= range.to,
  );

  return ranges.map((range) => ({
    config,
    mark,
    from: blockStart + range.from,
    to: blockStart + range.to,
    marks: range.marks,
    touch:
      offset === range.from ? "left-boundary" : offset === range.to ? "right-boundary" : "inside",
  }));
}

function invalidSourceLayersAtSelection(
  state: EditorState,
  entries: readonly LiveInlineMarkEntry[],
  sourceLayers: readonly SourceLayer[],
): InvalidSourceLayer[] {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return [];
  const blockStart = $from.start();
  const blockEnd = blockStart + $from.parent.content.size;
  const validContentRanges = sourceLayers.map((layer) => [layer.innerFrom, layer.innerTo] as const);
  const invalidTargets: InvalidSourceLayer[] = [];

  for (const { config, mark } of entries) {
    const ranges = markRanges($from.parent, mark);
    for (const range of ranges) {
      const from = blockStart + range.from;
      const to = blockStart + range.to;
      const hasSource = validContentRanges.some(
        ([innerFrom, innerTo]) => innerFrom === from && innerTo === to,
      );
      if (hasSource) continue;
      const before = textBetween(state.doc, Math.max(blockStart, from - config.open.length), from);
      const after = textBetween(state.doc, to, Math.min(blockEnd, to + config.close.length));
      if (hasDelimiterFragment(before, config) || hasDelimiterFragment(after, config)) {
        invalidTargets.push({
          layer: {
            id: `${config.mark}@invalid-${from}-${to}`,
            config,
            mark,
            from: Math.max(blockStart, from - config.open.length),
            to: Math.min(blockEnd, to + config.close.length),
            openFrom: Math.max(blockStart, from - config.open.length),
            openTo: from,
            innerFrom: from,
            innerTo: to,
            closeFrom: to,
            closeTo: Math.min(blockEnd, to + config.close.length),
          },
        });
      }
    }
  }

  return invalidTargets;
}

function commitSourceLayer(state: EditorState, layer: SourceLayer): Transaction {
  const tr = state.tr;
  tr.delete(layer.closeFrom, layer.closeTo);
  tr.delete(layer.openFrom, layer.openTo);
  const mappedPos = tr.mapping.map(state.selection.from);
  const nextPos = convertBoundarySpaceToNbsp(tr, mappedPos);
  tr.setSelection(TextSelection.create(tr.doc, nextPos));
  tr.removeStoredMark(layer.mark);
  return tr;
}

function enterSourceProjection(state: EditorState, layer: SourceLayer): Transaction {
  const tr = state.tr.addMark(layer.innerFrom, layer.innerTo, layer.mark.create());
  tr.removeStoredMark(layer.mark);
  return tr;
}

function convertBoundarySpaceToNbsp(tr: Transaction, pos: number): number {
  if (pos <= 1) return pos;
  const previous = textBetween(tr.doc, pos - 1, pos);
  if (previous !== " ") return pos;
  tr.insertText("\u00a0", pos - 1, pos);
  return pos;
}

function reenterCommittedLayer(state: EditorState, layer: CommittedLayer): Transaction {
  const tr = state.tr;
  const siblingMarks = layer.marks.filter((mark) => mark.type !== layer.mark);
  tr.insert(layer.to, state.schema.text(layer.config.close, siblingMarks));
  tr.insert(layer.from, state.schema.text(layer.config.open, siblingMarks));
  tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(state.selection.from)));
  tr.removeStoredMark(layer.mark);
  return tr;
}

function invalidateSourceLayer(state: EditorState, invalid: InvalidSourceLayer): Transaction {
  const tr = state.tr.removeMark(
    invalid.layer.innerFrom,
    invalid.layer.innerTo,
    invalid.layer.mark,
  );
  tr.removeStoredMark(invalid.layer.mark);
  return tr;
}

function inlineMarkDecorations(
  state: EditorState,
  entries: readonly LiveInlineMarkEntry[],
): Decoration[] {
  const resolved = resolveInlineSourceState(state, entries);
  return resolved.sourceLayers.flatMap((layer) => {
    const decorations = [
      Decoration.inline(layer.openFrom, layer.openTo, { class: "md-pending" }),
      Decoration.inline(layer.closeFrom, layer.closeTo, { class: "md-pending" }),
    ];
    if (!rangeHasMark(state.doc, layer)) {
      decorations.push(
        Decoration.inline(layer.innerFrom, layer.innerTo, { class: layer.config.liveClass }),
      );
    }
    return decorations;
  });
}

function selectionPathFor(state: EditorState, layers: readonly SourceLayer[]): SelectionPath {
  const pos = state.selection.from;
  const layer = activeSourceLayer(layers, pos);
  if (!layer) return { pos, boundary: "outside" };
  if (pos > layer.openFrom && pos < layer.openTo) return { pos, boundary: "open-delimiter" };
  if (pos > layer.closeFrom && pos < layer.closeTo) return { pos, boundary: "close-delimiter" };
  if (pos >= layer.innerFrom && pos <= layer.innerTo) return { pos, boundary: "content" };
  return { pos, boundary: "outside" };
}

function markRanges(
  parent: Node,
  mark: MarkType,
): { from: number; to: number; marks: readonly Mark[] }[] {
  const ranges: { from: number; to: number; marks: readonly Mark[] }[] = [];
  let offset = 0;
  parent.forEach((child) => {
    const from = offset;
    const to = offset + child.nodeSize;
    offset = to;
    if (!child.isText || !mark.isInSet(child.marks)) return;
    const previous = ranges.at(-1);
    if (previous && Mark.sameSet(previous.marks, child.marks) && previous.to === from) {
      previous.to = to;
      return;
    }
    ranges.push({ from, to, marks: child.marks });
  });
  return ranges;
}

function rangeHasMarkName(parent: Node, from: number, length: number, markName: string): boolean {
  const to = from + length;
  let offset = 0;
  let found = false;
  parent.forEach((child) => {
    const childFrom = offset;
    const childTo = offset + child.nodeSize;
    offset = childTo;
    if (found || childTo <= from || childFrom >= to) return;
    if (child.marks.some((mark) => mark.type.name === markName)) found = true;
  });
  return found;
}

function hasDelimiterFragment(text: string, config: LiveInlineMarkConfig): boolean {
  if (!text) return false;
  return text.split("").some((char) => config.open.includes(char) || config.close.includes(char));
}

function rangeHasMark(doc: Node, layer: SourceLayer): boolean {
  let hasText = false;
  let everyTextHasMark = true;
  doc.nodesBetween(layer.innerFrom, layer.innerTo, (node) => {
    if (!node.isText) return true;
    hasText = true;
    if (!layer.mark.isInSet(node.marks)) everyTextHasMark = false;
    return true;
  });
  return hasText && everyTextHasMark;
}

function textBetween(doc: Node, from: number, to: number): string {
  return doc.textBetween(from, to, "\n", "\ufffc");
}
