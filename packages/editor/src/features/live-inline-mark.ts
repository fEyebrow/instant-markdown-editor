import type { Mark, MarkType, Node, Schema } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { Plugin, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

interface LiveInlineMarkConfig {
  mark: string;
  open: string;
  close: string;
  delimiterLength: number;
  pending: RegExp;
  commit: RegExp;
  liveClass: string;
  moveTypedTextAfterStartBoundary?: boolean;
}

export interface LiveInlineMarkSpec {
  mark: string;
  delimiter: string;
  liveClass: string;
  allowDelimiterFallback?: boolean;
  moveTypedTextAfterStartBoundary?: boolean;
  revealOnArrow?: boolean;
}

interface PendingRange {
  from: number;
  to: number;
  text: string;
  marks: readonly Mark[];
}

export function createLiveInlineMarkFeature(schema: Schema, spec: LiveInlineMarkSpec): Plugin {
  return liveInlineMark(schema, liveInlineMarkConfig(spec));
}

export function createLiveInlineMarkFeatures(
  schema: Schema,
  specs: readonly LiveInlineMarkSpec[],
): Plugin[] {
  return [liveInlineMarkController(schema, specs.map(liveInlineMarkConfig))];
}

export function createLiveInlineMarkKeymap(
  schema: Schema,
  spec: LiveInlineMarkSpec,
): Record<string, Command> {
  const config = liveInlineMarkConfig(spec);
  const keymap: Record<string, Command> = {
    ArrowLeft: reopenPendingInlineMarkBeforeTrailingText(schema, config),
    Backspace: reopenPendingInlineMarkOnBackspace(schema, config),
  };
  if (spec.revealOnArrow) {
    keymap.ArrowLeft = chainCommands(
      reopenPendingInlineMarkBeforeTrailingText(schema, config),
      reopenPendingInlineMarkOnArrow(schema, config, "left"),
    );
    keymap.ArrowRight = reopenPendingInlineMarkOnArrow(schema, config, "right");
  }
  return keymap;
}

export function createLiveInlineMarkKeymaps(
  schema: Schema,
  specs: readonly LiveInlineMarkSpec[],
): Record<string, Command>[] {
  return specs.map((spec) => createLiveInlineMarkKeymap(schema, spec));
}

export function createLiveInlineMarkKeymapController(
  schema: Schema,
  specs: readonly LiveInlineMarkSpec[],
): Record<string, Command> {
  const commandsByKey = new Map<string, Command[]>();
  for (const spec of specs) {
    for (const [key, command] of Object.entries(createLiveInlineMarkKeymap(schema, spec))) {
      commandsByKey.set(key, [...(commandsByKey.get(key) ?? []), command]);
    }
  }

  return Object.fromEntries(
    [...commandsByKey.entries()].map(([key, commands]) => [key, chainCommands(...commands)]),
  );
}

const registeredConfigs = new Map<string, LiveInlineMarkConfig>();

function liveInlineMarkConfig(spec: LiveInlineMarkSpec): LiveInlineMarkConfig {
  const delimiter = escapeRegex(spec.delimiter);
  const delimiterChar = escapeRegex(spec.delimiter.at(0) ?? "");
  const leadingGuard = spec.allowDelimiterFallback ? "" : `(?<!${delimiterChar})`;
  const trailingGuard = `(?!${delimiterChar})`;
  const source = `${leadingGuard}${delimiter}([^${delimiterChar}\\s]+)${delimiter}${trailingGuard}`;

  const config = {
    mark: spec.mark,
    open: spec.delimiter,
    close: spec.delimiter,
    delimiterLength: spec.delimiter.length,
    pending: new RegExp(source, "g"),
    commit: new RegExp(`${source}([ \\u00a0]|[^${delimiterChar}])$`),
    liveClass: spec.liveClass,
    moveTypedTextAfterStartBoundary: spec.moveTypedTextAfterStartBoundary,
  };
  registeredConfigs.set(`${config.mark}:${config.open}:${config.close}`, config);
  return config;
}

function escapeRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

export function liveInlineMark(schema: Schema, config: LiveInlineMarkConfig): Plugin {
  const mark = schema.marks[config.mark];
  return new Plugin({
    props: {
      handleTextInput(view, from, to, text) {
        return handleLiveInlineMarkTextInput(view, from, to, text, mark, config);
      },
      decorations(state) {
        return DecorationSet.create(
          state.doc,
          liveInlineMarkDecorations(state, [{ config, mark }]),
        );
      },
    },
    appendTransaction(_trs, _oldState, newState) {
      return commitCompleteLiveInlineMarkSource(newState, mark, config);
    },
  });
}

function liveInlineMarkController(
  schema: Schema,
  configs: readonly LiveInlineMarkConfig[],
): Plugin {
  const entries = configs.map((config) => ({ config, mark: schema.marks[config.mark] }));
  return new Plugin({
    props: {
      handleTextInput(view, from, to, text) {
        return entries.some(({ config, mark }) =>
          handleLiveInlineMarkTextInput(view, from, to, text, mark, config),
        );
      },
      decorations(state) {
        return DecorationSet.create(state.doc, liveInlineMarkDecorations(state, entries));
      },
    },
    appendTransaction(_trs, _oldState, newState) {
      for (const { config, mark } of entries) {
        const tr = commitCompleteLiveInlineMarkSource(newState, mark, config);
        if (tr) return tr;
      }
      return null;
    },
  });
}

function handleLiveInlineMarkTextInput(
  view: Parameters<NonNullable<Plugin["props"]["handleTextInput"]>>[0],
  from: number,
  to: number,
  text: string,
  mark: MarkType,
  config: LiveInlineMarkConfig,
): boolean {
  if (!config.moveTypedTextAfterStartBoundary) return false;
  if (from !== to || text.length !== 1 || text.trim() === "") return false;
  if (text === config.open || text === config.close) return false;

  const source = committedMarkAtStart(view.state, mark, from);
  if (!source) return false;

  const sourceText = `${config.open}${text}${config.close}`;
  const siblingMarks = source.marks.filter((m) => m.type !== mark);
  const tr = view.state.tr.replaceWith(source.from, source.to, [
    view.state.schema.text(source.text, siblingMarks),
    view.state.schema.text(sourceText, siblingMarks),
  ]);
  tr.setSelection(TextSelection.create(tr.doc, source.from + source.text.length));
  tr.removeStoredMark(mark);
  view.dispatch(tr);
  return true;
}

function liveInlineMarkDecorations(
  state: EditorState,
  entries: readonly { config: LiveInlineMarkConfig; mark: MarkType }[],
): Decoration[] {
  return entries.flatMap(({ config, mark }) => [
    ...pendingDecorations(state.doc, config),
    ...boundaryDecorations(state, mark, config),
  ]);
}

function commitCompleteLiveInlineMarkSource(
  newState: EditorState,
  mark: MarkType,
  config: LiveInlineMarkConfig,
) {
  const { $from, empty } = newState.selection;
  if (!empty) return null;
  if (!$from.parent.isTextblock) return null;

  const before = $from.parent.textBetween(0, $from.parentOffset, "\n", "\ufffc");
  const match = config.commit.exec(before);
  if (!match) return null;

  const inner = match[1];
  const boundary = match[2] ?? "";
  const patternStart = $from.pos - match[0].length;
  if (textRangeHasMarkName($from.parent, patternStart - $from.start(), match[0].length, "code")) {
    return null;
  }
  const tr = newState.tr;
  const innerStart = match[0].indexOf(inner);
  const innerFrom = patternStart - $from.start() + innerStart;
  const innerTo = innerFrom + inner.length;
  const markSet = mark.create().addToSet([]);
  const markedText = inlineSourceNodesFromRange(
    newState.schema,
    $from.parent,
    innerFrom,
    innerTo,
    markSet,
    config,
  );
  const boundaryText =
    boundary === "" ? [] : [newState.schema.text(boundary === " " ? "\u00a0" : boundary)];
  tr.replaceWith(patternStart, $from.pos, [...markedText, ...boundaryText]);
  tr.removeStoredMark(mark);
  return tr;
}

function inlineSourceNodesFromRange(
  schema: Schema,
  parent: Node,
  from: number,
  to: number,
  marks: readonly Mark[],
  currentConfig: LiveInlineMarkConfig,
): Node[] {
  const nodes: Node[] = [];
  let offset = 0;
  parent.forEach((child) => {
    const childFrom = offset;
    const childTo = offset + child.nodeSize;
    offset = childTo;
    if (!child.isText || !child.text || childTo <= from || childFrom >= to) return;

    const textFrom = Math.max(from, childFrom) - childFrom;
    const textTo = Math.min(to, childTo) - childFrom;
    nodes.push(
      ...inlineSourceNodes(
        schema,
        child.text.slice(textFrom, textTo),
        mergeMarkSets(child.marks, marks),
        currentConfig,
      ),
    );
  });
  return nodes;
}

function inlineSourceNodes(
  schema: Schema,
  text: string,
  marks: readonly Mark[],
  currentConfig: LiveInlineMarkConfig,
): Node[] {
  const match = firstNestedSource(text, currentConfig);
  if (!match) return text ? [schema.text(text, marks)] : [];

  const nestedMark = schema.marks[match.config.mark];
  if (!nestedMark) return [schema.text(text, marks)];

  return [
    ...inlineSourceNodes(schema, text.slice(0, match.from), marks, currentConfig),
    ...inlineSourceNodes(schema, match.inner, nestedMark.create().addToSet(marks), match.config),
    ...inlineSourceNodes(schema, text.slice(match.to), marks, currentConfig),
  ];
}

function mergeMarkSets(existing: readonly Mark[], base: readonly Mark[]): readonly Mark[] {
  return existing.reduce<readonly Mark[]>((markSet, mark) => mark.addToSet(markSet), base);
}

interface NestedSourceMatch {
  config: LiveInlineMarkConfig;
  from: number;
  to: number;
  inner: string;
}

function firstNestedSource(
  text: string,
  currentConfig: LiveInlineMarkConfig,
): NestedSourceMatch | null {
  let best: NestedSourceMatch | null = null;
  for (const config of registeredConfigs.values()) {
    if (config === currentConfig) continue;
    config.pending.lastIndex = 0;
    const match = config.pending.exec(text);
    config.pending.lastIndex = 0;
    if (!match) continue;

    const from = match.index;
    const candidate = {
      config,
      from,
      to: from + match[0].length,
      inner: match[1],
    };
    if (
      !best ||
      candidate.from < best.from ||
      (candidate.from === best.from && config.delimiterLength > best.config.delimiterLength)
    ) {
      best = candidate;
    }
  }
  return best;
}

export function reopenPendingInlineMarkOnBackspace(
  schema: Schema,
  config: Pick<LiveInlineMarkConfig, "mark" | "open" | "close">,
): Command {
  const mark = schema.marks[config.mark];
  return (state, dispatch) => {
    const pending = pendingBeforeCommittedSpace(state, mark);
    if (!pending) return false;

    if (dispatch) {
      const totalLength = config.open.length + pending.text.length + config.close.length;
      const tr = state.tr.replaceWith(
        pending.from,
        pending.to,
        reopenedSourceNodes(schema, pending.marks, mark, pending.text, config),
      );
      tr.setSelection(TextSelection.create(tr.doc, pending.from + totalLength));
      tr.removeStoredMark(mark);
      dispatch(tr);
    }
    return true;
  };
}

export function reopenPendingInlineMarkOnArrow(
  schema: Schema,
  config: Pick<LiveInlineMarkConfig, "mark" | "open" | "close">,
  direction: "left" | "right",
): Command {
  const mark = schema.marks[config.mark];
  return (state, dispatch) => {
    const source = committedMarkAtBoundary(state, mark, direction);
    if (!source) return false;

    const totalLength = config.open.length + source.text.length + config.close.length;
    const selectionOffset =
      direction === "left" ? totalLength - Math.min(config.close.length, 1) : 1;

    if (dispatch) {
      const tr = state.tr.replaceWith(
        source.from,
        source.to,
        reopenedSourceNodes(schema, source.marks, mark, source.text, config),
      );
      tr.setSelection(TextSelection.create(tr.doc, source.from + selectionOffset));
      tr.removeStoredMark(mark);
      dispatch(tr);
    }
    return true;
  };
}

function reopenPendingInlineMarkBeforeTrailingText(
  schema: Schema,
  config: Pick<LiveInlineMarkConfig, "mark" | "open" | "close">,
): Command {
  const mark = schema.marks[config.mark];
  return (state, dispatch) => {
    const source = committedMarkAtBoundary(state, mark, "left");
    if (!source || !hasPlainTextAfter(state, source.to)) return false;

    const totalLength = config.open.length + source.text.length + config.close.length;
    const selectionOffset = totalLength - Math.min(config.close.length, 1);

    if (dispatch) {
      const tr = state.tr.replaceWith(
        source.from,
        source.to,
        reopenedSourceNodes(schema, source.marks, mark, source.text, config),
      );
      tr.setSelection(TextSelection.create(tr.doc, source.from + selectionOffset));
      tr.removeStoredMark(mark);
      dispatch(tr);
    }
    return true;
  };
}

function reopenedSourceNodes(
  schema: Schema,
  existingMarks: readonly Mark[],
  mark: MarkType,
  innerText: string,
  config: Pick<LiveInlineMarkConfig, "open" | "close">,
): Node[] {
  const innerMarks = existingMarks.filter((m) => m.type !== mark);
  const outerMarks = outerSiblingMarks(existingMarks, mark);
  return [
    schema.text(config.open, outerMarks),
    schema.text(innerText, innerMarks),
    schema.text(config.close, outerMarks),
  ];
}

function outerSiblingMarks(marks: readonly Mark[], mark: MarkType): readonly Mark[] {
  const rank = markRank(mark);
  return marks.filter((m) => m.type !== mark && markRank(m.type) < rank);
}

function chainCommands(...commands: Command[]): Command {
  return (state, dispatch, view) => commands.some((command) => command(state, dispatch, view));
}

function committedMarkAtBoundary(
  state: Parameters<Command>[0],
  mark: MarkType,
  direction: "left" | "right",
): PendingRange | null {
  const { from, empty } = state.selection;
  if (!empty) return null;

  let range: PendingRange | null = null;
  state.doc.descendants((node, pos) => {
    if (range) return false;
    if (!node.isText || !mark.isInSet(node.marks) || !node.text) return true;

    const start = pos;
    const end = pos + node.nodeSize;
    if ((direction === "left" && from === end) || (direction === "right" && from === start)) {
      range = { from: start, to: end, text: node.text, marks: node.marks };
      return false;
    }
    return true;
  });

  return range;
}

function hasPlainTextAfter(state: Parameters<Command>[0], position: number): boolean {
  const $pos = state.doc.resolve(position);
  const next = $pos.nodeAfter;
  return Boolean(next?.isText && next.text && !next.marks.length);
}

function committedMarkAtStart(
  state: Parameters<Command>[0],
  mark: MarkType,
  from: number,
): PendingRange | null {
  let range: PendingRange | null = null;
  state.doc.descendants((node, pos) => {
    if (range) return false;
    if (!node.isText || !mark.isInSet(node.marks) || !node.text) return true;
    if (pos === from) {
      range = { from: pos, to: pos + node.nodeSize, text: node.text, marks: node.marks };
      return false;
    }
    return true;
  });
  return range;
}

function pendingBeforeCommittedSpace(
  state: Parameters<Command>[0],
  mark: MarkType,
): PendingRange | null {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.isTextblock || $from.parentOffset === 0) return null;

  const parent = $from.parent;
  let offset = 0;

  for (let index = 0; index < parent.childCount; index += 1) {
    const node = parent.child(index);
    if (offset + node.nodeSize !== $from.parentOffset || node.text !== "\u00a0") {
      offset += node.nodeSize;
      continue;
    }
    if (index === 0) break;

    const previous = parent.child(index - 1);
    if (!previous.isText || !mark.isInSet(previous.marks) || !previous.text) break;

    const from = $from.start() + offset - previous.nodeSize;
    return { from, to: $from.pos, text: previous.text, marks: previous.marks };
  }

  return null;
}

function pendingDecorations(doc: Node, config: LiveInlineMarkConfig): Decoration[] {
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    if (node.content.size < 3) return false;

    const text = node.textBetween(0, node.content.size, "\n", "\ufffc");
    for (const match of text.matchAll(config.pending)) {
      const start = pos + 1 + (match.index ?? 0);
      const end = start + match[0].length;
      if (textRangeHasMarkName(node, start - pos - 1, match[0].length, "code")) continue;

      const innerStart = match[0].indexOf(match[1]);
      const innerEnd = innerStart + match[1].length;

      decos.push(Decoration.inline(start, start + innerStart, { class: "md-pending" }));
      decos.push(
        Decoration.inline(start + innerStart, start + innerEnd, { class: config.liveClass }),
      );
      decos.push(Decoration.inline(start + innerEnd, end, { class: "md-pending" }));
    }
    return false;
  });
  return decos;
}

function textRangeHasMarkName(node: Node, from: number, length: number, markName: string): boolean {
  const to = from + length;
  let offset = 0;
  let hasMark = false;

  node.forEach((child) => {
    if (hasMark) return;
    const childFrom = offset;
    const childTo = offset + child.nodeSize;
    offset = childTo;
    if (childTo <= from || childFrom >= to) return;
    if (child.marks.some((mark) => mark.type.name === markName)) hasMark = true;
  });

  return hasMark;
}

function boundaryDecorations(
  state: EditorState,
  mark: MarkType,
  config: LiveInlineMarkConfig,
): Decoration[] {
  const { empty, from } = state.selection;
  if (!empty) return [];

  const decos: Decoration[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText || !mark.isInSet(node.marks)) return true;

    const start = pos;
    const end = pos + node.nodeSize;
    if (from < start || from > end) return true;
    const atBoundary = from === start || from === end;
    if (!atBoundary && !hasReopenedInnerSource(node, mark)) return true;

    const rank = markRank(mark);
    const openSide = from === start ? 1000 + rank : -1000 + rank;
    const closeSide = from === end ? -1000 - rank : 1000 - rank;
    decos.push(markerWidget(start, config.open, openSide));
    decos.push(markerWidget(end, config.close, closeSide));
    return true;
  });

  return decos;
}

function markRank(mark: MarkType): number {
  return Object.keys(mark.schema.marks).indexOf(mark.name);
}

function hasReopenedInnerSource(node: Node, mark: MarkType): boolean {
  if (!node.text) return false;
  if (node.marks.some((m) => m.type.name === "code")) return false;
  for (const config of registeredConfigs.values()) {
    if (config.mark === mark.name) continue;
    config.pending.lastIndex = 0;
    const matched = config.pending.test(node.text);
    config.pending.lastIndex = 0;
    if (matched) return true;
  }
  return false;
}

function markerWidget(pos: number, text: string, side: number): Decoration {
  return Decoration.widget(
    pos,
    () => {
      const marker = document.createElement("span");
      marker.className = "md-pending";
      marker.textContent = text;
      return marker;
    },
    { marks: [], side },
  );
}
