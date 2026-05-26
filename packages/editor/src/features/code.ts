import type { Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import {
  createLiveInlineMarkFeature,
  createLiveInlineMarkKeymap,
  type LiveInlineMarkSpec,
} from "./live-inline-mark.ts";

const CONFIG = {
  mark: "code",
  delimiter: "`",
  liveClass: "md-live-code",
  allowDelimiterFallback: true,
} satisfies LiveInlineMarkSpec;

const ESCAPED_PENDING_MARKER = /\\`([^`\s\\]+)\\`/g;

export function serializeLiveCodePendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "`$1`");
}

export function codeKeymap(schema: Schema): Record<string, Command> {
  return createLiveInlineMarkKeymap(schema, CONFIG);
}

export function liveCode(schema: Schema) {
  return createLiveInlineMarkFeature(schema, CONFIG);
}
