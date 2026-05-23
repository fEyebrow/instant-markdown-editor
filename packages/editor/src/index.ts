import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import {
  createFeatureKeymaps,
  createFeaturePlugins,
  serializeFeatureMarkdown,
} from "./features/index.ts";
import { markdownPasteParser } from "./markdown/paste.ts";
import { markdownParser } from "./markdown/parser.ts";
import { markdownSerializer } from "./markdown/serializer.ts";
import { editorSchema } from "./schema/index.ts";

export interface EditorOptions {
  mount: HTMLElement;
  initialMarkdown?: string;
  onChange?: (markdown: string) => void;
}

export interface EditorHandle {
  view: EditorView;
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  destroy: () => void;
}

export function createEditor(options: EditorOptions): EditorHandle {
  const { mount, initialMarkdown = "", onChange } = options;

  const state = EditorState.create({
    doc: markdownParser.parse(initialMarkdown) ?? undefined,
    schema: editorSchema,
    plugins: [
      history(),
      keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
      ...createFeatureKeymaps(editorSchema).map((bindings) => keymap(bindings)),
      ...createFeaturePlugins(editorSchema),
      keymap(baseKeymap),
    ],
  });

  const view = new EditorView(mount, {
    state,
    clipboardTextParser: markdownPasteParser(),
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
      if (!doc) return;
      const newState = EditorState.create({
        doc,
        schema: editorSchema,
        plugins: view.state.plugins,
      });
      view.updateState(newState);
    },
    destroy: () => view.destroy(),
  };
}

function serializeMarkdown(doc: EditorState["doc"]): string {
  return serializeFeatureMarkdown(markdownSerializer.serialize(doc));
}

export { editorSchema };
export { EDITOR_SPEC_FEATURES } from "./specs.ts";
export type { EditorSpecCase, EditorSpecCheckpoint, EditorSpecFeature } from "./specs.ts";
export {
  applyAction,
  applyActions,
  parseChord,
  projectEditorView,
  setMarkdownWithCursor,
} from "./spec-runner.ts";
export type { Chord, ProjectionOptions } from "./spec-runner.ts";
