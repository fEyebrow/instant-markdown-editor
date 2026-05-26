import type { MarkSpec, Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { liveInlineMark, reopenPendingInlineMarkOnBackspace } from "./live-inline-mark.ts";

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

const CONFIG = {
  mark: "strikethrough",
  open: "~~",
  close: "~~",
  pending: /(?<!~)~~([^~\s]+)~~(?!~)/g,
  commit: /(?<!~)~~([^~\s]+)~~(?!~)([ \u00a0]|[^~])$/,
  liveClass: "md-live-strikethrough",
};
const ESCAPED_PENDING_MARKER = /\\?~\\?~([^~\s\\]+)\\?~\\?~/g;

export function serializeLiveStrikethroughPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "~~$1~~");
}

export function strikethroughKeymap(schema: Schema): Record<string, Command> {
  return {
    Backspace: reopenPendingInlineMarkOnBackspace(schema, CONFIG),
  };
}

export function liveStrikethrough(schema: Schema) {
  return liveInlineMark(schema, CONFIG);
}
