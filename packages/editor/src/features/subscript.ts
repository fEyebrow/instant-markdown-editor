import type { MarkSpec, Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import {
  createLiveInlineMarkFeature,
  createLiveInlineMarkKeymap,
  type LiveInlineMarkSpec,
} from "./live-inline-mark.ts";

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

const CONFIG = {
  mark: "subscript",
  delimiter: "~",
  liveClass: "md-live-subscript",
  allowDelimiterFallback: true,
  moveTypedTextAfterStartBoundary: true,
} satisfies LiveInlineMarkSpec;

const ESCAPED_PENDING_MARKER = /\\?~([^~\s\\]+)\\?~/g;

export function serializeLiveSubscriptPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "~$1~");
}

export function subscriptKeymap(schema: Schema): Record<string, Command> {
  return createLiveInlineMarkKeymap(schema, CONFIG);
}

export function liveSubscript(schema: Schema) {
  return createLiveInlineMarkFeature(schema, CONFIG);
}
