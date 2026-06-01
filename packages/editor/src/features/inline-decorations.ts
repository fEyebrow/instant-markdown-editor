import { Plugin, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { getDelims } from "./inline-normalize.ts";

function buildDecorationSet(state: EditorState): DecorationSet {
  const cursor = state.selection.empty ? state.selection.from : null;
  const decorations: Decoration[] = [];

  for (const delim of getDelims(state)) {
    const cursorInside = cursor !== null && cursor >= delim.spanFrom && cursor <= delim.spanTo;
    if (delim.forceHidden) {
      decorations.push(
        Decoration.inline(delim.from, delim.to, { class: delim.className ?? "syntax-hidden" }),
      );
      continue;
    }
    if (delim.softInside) {
      if (!cursorInside) {
        decorations.push(Decoration.inline(delim.from, delim.to, { class: "syntax-hidden" }));
      }
      continue;
    }

    decorations.push(
      Decoration.inline(delim.from, delim.to, {
        class: delim.forceVisible || cursorInside ? "syntax-hint" : "syntax-hidden",
      }),
    );
  }

  return decorations.length ? DecorationSet.create(state.doc, decorations) : DecorationSet.empty;
}

export function syntaxHintsPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    state: {
      init: (_, state) => buildDecorationSet(state),
      apply: (_tr, _previous, _oldState, newState) => buildDecorationSet(newState),
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}
