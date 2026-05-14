import { defaultMarkdownParser } from "prosemirror-markdown";
import { Slice } from "prosemirror-model";
import type { ResolvedPos, Schema } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";

export function markdownClipboardTextParser(
  _schema: Schema,
): (text: string, $context: ResolvedPos, plain: boolean, view: EditorView) => Slice {
  return (text, _$context, plain): Slice => {
    if (!text || plain) return null as unknown as Slice;
    const doc = defaultMarkdownParser.parse(text);
    if (!doc) return null as unknown as Slice;
    return doc.slice(0, doc.content.size);
  };
}
