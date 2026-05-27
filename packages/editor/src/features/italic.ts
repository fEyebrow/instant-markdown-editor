import type { MarkSpec } from "prosemirror-model";
import type { LiveInlineMarkSpec } from "./live-inline-mark.ts";

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

export const liveItalicSpec = {
  mark: "em",
  delimiter: "*",
  liveClass: "md-live-em",
  allowDelimiterFallback: true,
} satisfies LiveInlineMarkSpec;
const ESCAPED_PENDING_MARKER = /\\\*([^*\s\\]+)\\\*/g;

export function serializeLiveItalicPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "*$1*");
}
