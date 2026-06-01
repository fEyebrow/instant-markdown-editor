import type { MarkSpec } from "prosemirror-model";

export const subscriptMarkSpecs = {
  subscript: {
    parseDOM: [{ tag: "sub" }],
    toDOM() {
      return ["sub"];
    },
  } as MarkSpec,
};

export const subscriptMarkdownParseSpecs = {
  sub: { mark: "subscript" },
};

export const subscriptMarkdownSerializeSpecs = {
  subscript: { open: "~", close: "~", expelEnclosingWhitespace: true },
};

export const subscriptMarkRankEntries: [string, number][] = [["subscript", 2.625]];

const ESCAPED_PENDING_MARKER = /\\?~([^~\s\\]+)\\?~/g;

export function serializeLiveSubscriptPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "~$1~");
}
