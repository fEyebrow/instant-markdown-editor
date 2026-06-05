import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { createFeatureKeymaps, createFeaturePlugins } from "./features/index.ts";
import { markdownPasteParser } from "./markdown/paste.ts";
import { markdownParser } from "./markdown/parser.ts";
import { markdownSerializer } from "./markdown/serializer.ts";
import { editorSchema } from "./schema/index.ts";
import { cursorRenderPlugin } from "./specs/cursor-render.ts";

export interface EditorOptions {
  mount: HTMLElement;
  initialMarkdown?: string;
  onChange?: (markdown: string) => void;
  cursorProjection?: boolean;
  scrollToSelection?: boolean;
}

export interface EditorHandle {
  view: EditorView;
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  destroy: () => void;
}

export function createEditor(options: EditorOptions): EditorHandle {
  const {
    mount,
    initialMarkdown = "",
    onChange,
    cursorProjection = false,
    scrollToSelection = true,
  } = options;

  const state = EditorState.create({
    doc: markdownParser.parse(initialMarkdown) ?? undefined,
    schema: editorSchema,
    plugins: [
      history(),
      keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
      ...createFeatureKeymaps(editorSchema).map((bindings) => keymap(bindings)),
      ...createFeaturePlugins(editorSchema),
      ...(cursorProjection ? [cursorRenderPlugin()] : []),
      keymap(baseKeymap),
    ],
  });

  const view = new EditorView(mount, {
    state,
    clipboardTextParser: markdownPasteParser(),
    handleScrollToSelection: scrollToSelection ? undefined : () => true,
    dispatchTransaction(tr) {
      const next = view.state.apply(tr);
      view.updateState(next);
      if (tr.docChanged && onChange) {
        onChange(serializeMarkdown(next.doc));
      }
    },
  });

  return {
    view,
    getMarkdown: () => serializeMarkdown(view.state.doc),
    setMarkdown(markdown) {
      const doc = markdownParser.parse(markdown);
      const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content);
      tr.setSelection(TextSelection.atEnd(tr.doc));
      view.dispatch(tr);
    },
    destroy: () => view.destroy(),
  };
}

function serializeMarkdown(doc: EditorState["doc"]): string {
  return markdownSerializer.serialize(doc);
}
