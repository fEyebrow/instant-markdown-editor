import type { MarkSpec } from "prosemirror-model";
import type { LiveInlineMarkSpec } from "./live-inline-mark.ts";

export const strikethroughMarkSpecs = {
  strikethrough: {
    parseDOM: [{ tag: "s" }, { tag: "del" }, { tag: "strike" }],
    toDOM() {
      return ["s"];
    },
  } as MarkSpec,
};

export const strikethroughMarkdownParseSpecs = {
  s: { mark: "strikethrough" },
};

export const strikethroughMarkdownSerializeSpecs = {
  strikethrough: { open: "~~", close: "~~", expelEnclosingWhitespace: true },
};

export const strikethroughMarkRankEntries: [string, number][] = [["strikethrough", 2.5]];

export const liveStrikethroughSpec = {
  mark: "strikethrough",
  delimiter: "~~",
  liveClass: "md-live-strikethrough",
} satisfies LiveInlineMarkSpec;
const ESCAPED_PENDING_MARKER = /\\?~\\?~([^~\s\\]+)\\?~\\?~/g;

export function serializeLiveStrikethroughPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "~~$1~~");
}
