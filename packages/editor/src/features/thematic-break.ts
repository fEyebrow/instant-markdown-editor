import { TextSelection } from "prosemirror-state";
import type { Command } from "prosemirror-state";

const thematicBreakOnEnter: Command = (state, dispatch) => {
  const { $from } = state.selection;
  const parent = $from.parent;

  if (parent.type !== state.schema.nodes.paragraph || parent.textContent !== "---") {
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
