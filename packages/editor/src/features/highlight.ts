import type { MarkSpec } from "prosemirror-model";
import type { LiveInlineMarkSpec } from "./live-inline-mark.ts";

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

export const liveHighlightSpec = {
  mark: "highlight",
  delimiter: "==",
  liveClass: "md-live-highlight",
  revealOnArrow: true,
} satisfies LiveInlineMarkSpec;

const ESCAPED_PENDING_MARKER = /\\?=\\?=([^=\s\\]+)\\?=\\?=/g;

export function serializeLiveHighlightPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "==$1==");
}
