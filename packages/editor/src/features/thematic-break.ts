import type { Schema } from "prosemirror-model";
import { Plugin, TextSelection } from "prosemirror-state";
import type { Command } from "prosemirror-state";

const thematicBreakOnEnter: Command = (state, dispatch) => {
  const { $from } = state.selection;
  const parent = $from.parent;

  if (parent.type !== state.schema.nodes.paragraph || !/^-{3,}$/.test(parent.textContent)) {
    return false;
  }

  if (dispatch) {
    const { tr, schema } = state;
    const pos = $from.before();
    tr.replaceWith(pos, pos + parent.nodeSize, [
      schema.nodes.horizontal_rule.create(),
      schema.nodes.paragraph.create(),
    ]);
    tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 2)));
    dispatch(tr);
  }
  return true;
};

export const thematicBreakKeymap = {
  Enter: thematicBreakOnEnter,
};

export function thematicBreakLeaveLine(schema: Schema): Plugin {
  return new Plugin({
    appendTransaction(_transactions, oldState, newState) {
      const oldSel = oldState.selection;
      const newSel = newState.selection;
      if (oldSel.eq(newSel)) return null;

      const $oldFrom = oldSel.$from;
      if ($oldFrom.depth !== 1) return null;
      const oldParent = $oldFrom.parent;
      if (oldParent.type !== schema.nodes.paragraph) return null;
      if (oldParent.textContent !== "---") return null;

      const paraStart = $oldFrom.before(1);
      const paraEnd = $oldFrom.after(1);
      const newFrom = newSel.$from.pos;
      if (newFrom > paraStart && newFrom < paraEnd) return null;

      const paraInNew = newState.doc.nodeAt(paraStart);
      if (
        !paraInNew ||
        paraInNew.type !== schema.nodes.paragraph ||
        !/^-{3,}$/.test(paraInNew.textContent)
      ) {
        return null;
      }

      return newState.tr.replaceWith(
        paraStart,
        paraStart + paraInNew.nodeSize,
        schema.nodes.horizontal_rule.create(),
      );
    },
  });
}
