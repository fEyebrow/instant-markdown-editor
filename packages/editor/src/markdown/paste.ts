import type { ResolvedPos, Slice } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { markdownParser } from "./parser.ts";

export function markdownPasteParser(): (
  text: string,
  $context: ResolvedPos,
  plain: boolean,
  view: EditorView,
) => Slice {
  return (text, _$context, plain): Slice => {
    if (!text || plain) return null as unknown as Slice;
    const doc = markdownParser.parse(text);
    if (!doc) return null as unknown as Slice;
    return doc.slice(0, doc.content.size);
  };
}
