import type { MarkSpec, Node, Schema } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export const italicMarkSpecs = {
  em: {
    parseDOM: [
      { tag: "i" },
      { tag: "em" },
      { style: "font-style=italic" },
      { style: "font-style=normal", clearMark: (m) => m.type.name === "em" },
    ],
    toDOM() {
      return ["em"];
    },
  } as MarkSpec,
};

export const italicMarkdownParseSpecs = {
  em: { mark: "em" },
};

export const italicMarkdownSerializeSpecs = {
  em: { open: "*", close: "*", expelEnclosingWhitespace: true },
};

export const italicMarkRankEntries: [string, number][] = [["em", 2]];

const PATTERN = /\*([^*\s]+)\*/g;
// Browsers may insert U+00A0 (nbsp) instead of " " at end of contentEditable.
const COMMIT = /\*([^*\s]+)\*[ \u00a0]$/;

function pendingDecorations(doc: Node): Decoration[] {
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    if (node.content.size < 3) return false;
    const text = node.textBetween(0, node.content.size, "\n", "\ufffc");
    for (const m of text.matchAll(PATTERN)) {
      const start = pos + 1 + (m.index ?? 0);
      const end = start + m[0].length;
      decos.push(Decoration.inline(start, start + 1, { class: "md-pending" }));
      decos.push(Decoration.inline(end - 1, end, { class: "md-pending" }));
    }
    return false;
  });
  return decos;
}

export function liveItalic(schema: Schema): Plugin {
  const em = schema.marks.em;
  return new Plugin({
    props: {
      decorations(state) {
        return DecorationSet.create(state.doc, pendingDecorations(state.doc));
      },
    },
    appendTransaction(_trs, _oldState, newState) {
      const { $from, empty } = newState.selection;
      if (!empty) return null;
      if (!$from.parent.isTextblock) return null;
      const offset = $from.parentOffset;
      if (offset < 4) return null;
      const before = $from.parent.textBetween(0, offset, "\n", "\ufffc");
      const m = COMMIT.exec(before);
      if (!m) return null;

      const inner = m[1];
      const patternStart = $from.pos - m[0].length;
      const tr = newState.tr;
      const emText = newState.schema.text(inner, [em.create()]);
      const spaceText = newState.schema.text(" ");
      tr.replaceWith(patternStart, $from.pos, [emText, spaceText]);
      tr.removeStoredMark(em);
      return tr;
    },
  });
}
