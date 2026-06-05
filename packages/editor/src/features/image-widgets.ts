import { Plugin, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { normalizeInlineKey } from "./inline-normalize.ts";

export function imageWidgetsPlugin(): Plugin<DecorationSet> {
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

function buildDecorationSet(state: EditorState): DecorationSet {
  const plan = normalizeInlineKey.getState(state);
  if (!plan) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  for (const block of plan.blocks) {
    for (const span of block.spans) {
      if (span.type !== "image") continue;
      const srcAttr = span.attrs?.src;
      const src = typeof srcAttr === "string" ? srcAttr : "";
      if (!src) continue;
      const altAttr = span.attrs?.alt;
      const alt = typeof altAttr === "string" ? altAttr : "";
      const titleAttr = span.attrs?.title;
      const title = typeof titleAttr === "string" ? titleAttr : null;
      const pos = block.blockStart + span.openFrom;
      decorations.push(Decoration.widget(pos, () => buildImage(src, alt, title), { side: -1 }));
    }
  }

  return decorations.length ? DecorationSet.create(state.doc, decorations) : DecorationSet.empty;
}

function buildImage(src: string, alt: string, title: string | null): HTMLElement {
  const img = document.createElement("img");
  img.className = "md-image-widget";
  img.setAttribute("src", src);
  if (alt) img.setAttribute("alt", alt);
  if (title) img.setAttribute("title", title);
  return img;
}
