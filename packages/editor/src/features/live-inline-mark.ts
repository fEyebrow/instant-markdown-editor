import type { MarkType, Node, Schema } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { Plugin, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

interface LiveInlineMarkConfig {
  mark: string;
  open: string;
  close: string;
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
}

export function createLiveInlineMarkFeature(schema: Schema, spec: LiveInlineMarkSpec): Plugin {
  return liveInlineMark(schema, liveInlineMarkConfig(spec));
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

function liveInlineMarkConfig(spec: LiveInlineMarkSpec): LiveInlineMarkConfig {
  const delimiter = escapeRegex(spec.delimiter);
  const delimiterChar = escapeRegex(spec.delimiter.at(0) ?? "");
  const leadingGuard = spec.allowDelimiterFallback ? "" : `(?<!${delimiterChar})`;
  const trailingGuard = `(?!${delimiterChar})`;
  const source = `${leadingGuard}${delimiter}([^${delimiterChar}\\s]+)${delimiter}${trailingGuard}`;

  return {
    mark: spec.mark,
    open: spec.delimiter,
    close: spec.delimiter,
    pending: new RegExp(source, "g"),
    commit: new RegExp(`${source}([ \\u00a0]|[^${delimiterChar}])$`),
    liveClass: spec.liveClass,
    moveTypedTextAfterStartBoundary: spec.moveTypedTextAfterStartBoundary,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

export function liveInlineMark(schema: Schema, config: LiveInlineMarkConfig): Plugin {
  const mark = schema.marks[config.mark];
  return new Plugin({
    props: {
      handleTextInput(view, from, to, text) {
        if (!config.moveTypedTextAfterStartBoundary) return false;
        if (from !== to || text.length !== 1 || text.trim() === "") return false;
        if (text === config.open || text === config.close) return false;

        const source = committedMarkAtStart(view.state, mark, from);
        if (!source) return false;

        const sourceText = `${config.open}${text}${config.close}`;
        const tr = view.state.tr.replaceWith(source.from, source.to, [
          view.state.schema.text(source.text),
          view.state.schema.text(sourceText),
        ]);
        tr.setSelection(TextSelection.create(tr.doc, source.from + source.text.length));
        tr.removeStoredMark(mark);
        view.dispatch(tr);
        return true;
      },
      decorations(state) {
        return DecorationSet.create(state.doc, [
          ...pendingDecorations(state.doc, config),
          ...boundaryDecorations(state, mark, config),
        ]);
      },
    },
    appendTransaction(_trs, _oldState, newState) {
      const { $from, empty } = newState.selection;
      if (!empty) return null;
      if (!$from.parent.isTextblock) return null;

      const before = $from.parent.textBetween(0, $from.parentOffset, "\n", "\ufffc");
      const match = config.commit.exec(before);
      if (!match) return null;

      const inner = match[1];
      const boundary = match[2] ?? "";
      const patternStart = $from.pos - match[0].length;
      if (
        textRangeHasMarkName($from.parent, patternStart - $from.start(), match[0].length, "code")
      ) {
        return null;
      }
      const tr = newState.tr;
      const markedText = newState.schema.text(inner, [mark.create()]);
      const boundaryText =
        boundary === "" ? [] : [newState.schema.text(boundary === " " ? "\u00a0" : boundary)];
      tr.replaceWith(patternStart, $from.pos, [markedText, ...boundaryText]);
      tr.removeStoredMark(mark);
      return tr;
    },
  });
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
      const text = `${config.open}${pending.text}${config.close}`;
      const tr = state.tr.replaceWith(pending.from, pending.to, schema.text(text));
      tr.setSelection(TextSelection.create(tr.doc, pending.from + text.length));
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

    const text = `${config.open}${source.text}${config.close}`;
    const selectionOffset =
      direction === "left" ? text.length - Math.min(config.close.length, 1) : 1;

    if (dispatch) {
      const tr = state.tr.replaceWith(source.from, source.to, schema.text(text));
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

    const text = `${config.open}${source.text}${config.close}`;
    const selectionOffset = text.length - Math.min(config.close.length, 1);

    if (dispatch) {
      const tr = state.tr.replaceWith(source.from, source.to, schema.text(text));
      tr.setSelection(TextSelection.create(tr.doc, source.from + selectionOffset));
      tr.removeStoredMark(mark);
      dispatch(tr);
    }
    return true;
  };
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
      range = { from: start, to: end, text: node.text };
      return false;
    }
    return true;
  });

  return range;
}

function hasPlainTextAfter(state: Parameters<Command>[0], position: number): boolean {
  const $pos = state.doc.resolve(position);
  const next = $pos.nodeAfter;
  return Boolean(next?.isText && next.text?.trim() && !next.marks.length);
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
      range = { from: pos, to: pos + node.nodeSize, text: node.text };
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
    return { from, to: $from.pos, text: previous.text };
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
    if (from !== start && from !== end) return true;

    decos.push(markerWidget(start, config.open, from === start ? 1 : -1));
    decos.push(markerWidget(end, config.close, from === end ? -1 : 1));
    return true;
  });

  return decos;
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
