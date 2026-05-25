import type { Node as ProseMirrorNode, Schema } from "prosemirror-model";
import { Plugin, TextSelection } from "prosemirror-state";
import type { Command, EditorState } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const HEADING_PATTERN = /^(#{1,6}) (.+)$/;

export interface HeadingTriggerMatch {
  level: number;
  content: string;
  hashCount: number;
}

export function matchHeadingTrigger(text: string): HeadingTriggerMatch | null {
  const match = HEADING_PATTERN.exec(text);
  if (!match) return null;
  const hashes = match[1];
  return { level: hashes.length, content: match[2], hashCount: hashes.length };
}

function paragraphAllowsHeadingTrigger(
  state: EditorState,
  $from: EditorState["selection"]["$from"],
) {
  if ($from.parent.type !== state.schema.nodes.paragraph) return false;
  return true;
}

function pendingDecorations(state: EditorState): Decoration[] {
  const decos: Decoration[] = [];
  const paragraphType = state.schema.nodes.paragraph;
  state.doc.descendants((node, pos) => {
    if (node.type !== paragraphType) return true;
    const match = matchHeadingTrigger(node.textContent);
    if (!match) return false;
    const prefixFrom = pos + 1;
    const prefixTo = prefixFrom + match.hashCount;
    const contentFrom = prefixTo + 1;
    const contentTo = pos + 1 + node.content.size;
    decos.push(Decoration.inline(prefixFrom, prefixTo, { class: "md-block-pending" }));
    decos.push(Decoration.inline(contentFrom, contentTo, { class: "md-block-pending-content" }));
    return false;
  });
  return decos;
}

export function commitHeadingFromParagraph(
  state: EditorState,
  paragraph: ProseMirrorNode,
  paragraphStart: number,
): ReturnType<EditorState["tr"]["replaceWith"]> | null {
  const match = matchHeadingTrigger(paragraph.textContent);
  if (!match) return null;
  const { schema } = state;
  const headingType = schema.nodes.heading;
  if (!headingType) return null;
  const consumed = match.hashCount + 1; // "#"+ ' '
  const innerStart = paragraphStart + 1 + consumed;
  const innerEnd = paragraphStart + 1 + paragraph.content.size;
  const slice = state.doc.slice(innerStart, innerEnd);
  const heading = headingType.create({ level: match.level }, slice.content);
  return state.tr.replaceWith(paragraphStart, paragraphStart + paragraph.nodeSize, heading);
}

const headingOnEnter: Command = (state, dispatch) => {
  const { $from } = state.selection;
  if (!paragraphAllowsHeadingTrigger(state, $from)) return false;
  const paragraph = $from.parent;
  const match = matchHeadingTrigger(paragraph.textContent);
  if (!match) return false;
  if (dispatch) {
    const paragraphDepth = $from.depth;
    const paragraphStart = $from.before(paragraphDepth);
    const tr = commitHeadingFromParagraph(state, paragraph, paragraphStart);
    if (!tr) return false;
    const headingNode = tr.doc.nodeAt(paragraphStart);
    const after = paragraphStart + (headingNode ? headingNode.nodeSize : 0);
    tr.insert(after, state.schema.nodes.paragraph.create());
    tr.setSelection(TextSelection.near(tr.doc.resolve(after + 1)));
    dispatch(tr.scrollIntoView());
  }
  return true;
};

export const atxHeadingKeymap = {
  Enter: headingOnEnter,
};

export function atxHeading(schema: Schema): Plugin {
  return new Plugin({
    props: {
      decorations(state) {
        return DecorationSet.create(state.doc, pendingDecorations(state));
      },
    },
    appendTransaction(_transactions, oldState, newState) {
      const oldSel = oldState.selection;
      const newSel = newState.selection;
      if (oldSel.eq(newSel)) return null;

      const $oldFrom = oldSel.$from;
      const oldParent = $oldFrom.parent;
      if (oldParent.type !== schema.nodes.paragraph) return null;

      const match = matchHeadingTrigger(oldParent.textContent);
      if (!match) return null;

      const paraDepth = $oldFrom.depth;
      const paraStart = $oldFrom.before(paraDepth);

      const $newFrom = newSel.$from;
      if (
        $newFrom.depth >= paraDepth &&
        $newFrom.parent.type === schema.nodes.paragraph &&
        $newFrom.before(paraDepth) === paraStart
      ) {
        return null;
      }

      const paraInNew = newState.doc.nodeAt(paraStart);
      if (!paraInNew || paraInNew.type !== schema.nodes.paragraph) return null;
      const newMatch = matchHeadingTrigger(paraInNew.textContent);
      if (!newMatch) return null;

      return commitHeadingFromParagraph(newState, paraInNew, paraStart);
    },
  });
}
