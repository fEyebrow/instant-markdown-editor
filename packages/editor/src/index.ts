import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { undoInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { defaultMarkdownParser, defaultMarkdownSerializer, schema } from "prosemirror-markdown";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { horizontalRuleOnEnter } from "./keymap/horizontal-rule-on-enter.ts";
import { listKeymap } from "./keymap/list-keymap.ts";
import { markdownShortcutsPlugin } from "./markdown-shortcuts/index.ts";

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
    doc: defaultMarkdownParser.parse(initialMarkdown) ?? undefined,
    schema,
    plugins: [
      history(),
      keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
      keymap({ Backspace: undoInputRule }),
      keymap({ Enter: horizontalRuleOnEnter }),
      keymap(listKeymap(schema)),
      markdownShortcutsPlugin(schema),
      keymap(baseKeymap),
    ],
  });

  const view = new EditorView(mount, {
    state,
    dispatchTransaction(tr) {
      const next = view.state.apply(tr);
      view.updateState(next);
      if (tr.docChanged && onChange) {
        onChange(defaultMarkdownSerializer.serialize(next.doc));
      }
    },
  });

  return {
    view,
    getMarkdown: () => defaultMarkdownSerializer.serialize(view.state.doc),
    setMarkdown(markdown) {
      const doc = defaultMarkdownParser.parse(markdown);
      if (!doc) return;
      const newState = EditorState.create({
        doc,
        schema,
        plugins: view.state.plugins,
      });
      view.updateState(newState);
    },
    destroy: () => view.destroy(),
  };
}

export { schema as markdownSchema } from "prosemirror-markdown";
