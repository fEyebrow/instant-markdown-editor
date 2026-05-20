import { Plugin, TextSelection } from "prosemirror-state";
import type { Command, EditorState, Transaction } from "prosemirror-state";
import type { Fragment } from "prosemirror-model";
import { defaultMarkdownParser } from "prosemirror-markdown";
import { serializeTextblockToRawMarkdown } from "./raw-markdown.ts";

type UndoableInput = { from: number; to: number; content: Fragment } | null;
const inlineMarkdownPatterns = [
  /(?<!\\)\[(.+)\]\(((?:https?:\/\/|mailto:|\/|#)[^\s)]+)\)$/,
  /(?<!\\)\*\*\*(\S(?:.*?\S)?)\*\*\*$/,
  /(?<![\\\w_])___(\S(?:.*?\S)?)___$/,
  /(?<![\\*])\*\*(?!\*)(\S(?:.*?\S)?)(?<!\*)\*\*$/,
  /(?<![\\\w_])__(?!_)(\S(?:.*?\S)?)(?<!_)__$/,
  /(?<![\\*])\*(?!\*)(\S(?:.*?\S)?)(?<!\*)\*$/,
  /(?<![\\\w_])_(?!_)(\S(?:.*?\S)?)(?<!_)_$/,
  /(?<!\\)`(\S(?:.*?\S)?)`$/,
];

export function liveInlineMarkdownPlugin() {
  let plugin: Plugin<UndoableInput> = new Plugin<UndoableInput>({
    state: {
      init() {
        return null;
      },
      apply(this: typeof plugin, tr, previous) {
        const stored = tr.getMeta(this);
        if (stored) return stored;
        return tr.selectionSet || tr.docChanged ? null : previous;
      },
    },
    props: {
      handleTextInput(view, _from, _to, _text, defaultTr) {
        if (view.composing) return false;

        const tr = defaultTr();
        const nextState = view.state.apply(tr);
        const undoable = applyInlineMarkdownConversion(nextState, tr);
        if (!undoable) return false;

        tr.setMeta(plugin, undoable);
        view.dispatch(tr);
        return true;
      },
    },
    isLiveInlineMarkdown: true,
  });

  return plugin;
}

export const undoLiveInlineMarkdown: Command = (state, dispatch) => {
  for (const plugin of state.plugins) {
    if (!(plugin.spec as { isLiveInlineMarkdown?: boolean }).isLiveInlineMarkdown) continue;
    const undoable = plugin.getState(state) as UndoableInput;
    if (!undoable) continue;
    if (dispatch) {
      const tr = state.tr.replaceWith(undoable.from, undoable.to, undoable.content);
      tr.setSelection(TextSelection.near(tr.doc.resolve(undoable.from + undoable.content.size)));
      dispatch(tr);
    }
    return true;
  }
  return false;
};

function applyInlineMarkdownConversion(
  state: EditorState,
  tr: Transaction,
): { from: number; to: number; content: Fragment } | null {
  const { $from } = state.selection;
  const parent = $from.parent;
  if (!parent.type.isTextblock || parent.type.spec.code) return null;

  const markdown = serializeTextblockToRawMarkdown(parent);
  if (!hasInlineMarkdownCandidate(markdown)) return null;

  const parsedBlock = defaultMarkdownParser.parse(markdown).firstChild;
  if (!parsedBlock || parsedBlock.type !== parent.type) return null;
  if (!sameAttrs(parent.attrs, parsedBlock.attrs)) return null;
  if (parent.content.eq(parsedBlock.content)) return null;

  const start = $from.start();
  const end = start + parent.content.size;
  tr.replaceWith(start, end, parsedBlock.content);
  tr.setSelection(TextSelection.near(tr.doc.resolve(start + parsedBlock.content.size)));
  tr.setStoredMarks([]);
  return {
    from: start,
    to: start + parsedBlock.content.size,
    content: parent.content,
  };
}

function hasInlineMarkdownCandidate(markdown: string): boolean {
  for (const pattern of inlineMarkdownPatterns) {
    if (pattern.test(markdown)) return true;
  }
  return false;
}

function sameAttrs(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}
