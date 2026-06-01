import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export function cursorRenderPlugin(): Plugin {
  return new Plugin({
    props: {
      decorations(state) {
        const sel = state.selection;

        if (!sel.empty) {
          return DecorationSet.create(state.doc, [
            Decoration.widget(sel.from, makeWidget("play-selection-marker", "["), { side: -1 }),
            Decoration.widget(sel.to, makeWidget("play-selection-marker", "]"), { side: 1 }),
          ]);
        }

        return DecorationSet.create(state.doc, [
          Decoration.widget(sel.from, makeWidget("play-caret", ""), { side: 0 }),
        ]);
      },
    },
  });
}

function makeWidget(className: string, content: string): () => HTMLElement {
  return () => {
    const el = document.createElement("span");
    el.className = className;
    if (content) el.textContent = content;
    return el;
  };
}
