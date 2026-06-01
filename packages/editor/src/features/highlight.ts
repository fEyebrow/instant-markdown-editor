import type { MarkSpec } from "prosemirror-model";

export const highlightMarkSpecs = {
  highlight: {
    parseDOM: [{ tag: "mark" }],
    toDOM() {
      return ["mark"];
    },
  } as MarkSpec,
};

export const highlightMarkdownParseSpecs = {
  mark: { mark: "highlight" },
};

export const highlightMarkdownSerializeSpecs = {
  highlight: { open: "==", close: "==", expelEnclosingWhitespace: true },
};

export const highlightMarkRankEntries: [string, number][] = [["highlight", 2.75]];

const ESCAPED_PENDING_MARKER = /\\?=\\?=([^=\s\\]+)\\?=\\?=/g;

export function serializeLiveHighlightPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "==$1==");
}
