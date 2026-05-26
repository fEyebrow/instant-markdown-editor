import type { Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import {
  createLiveInlineMarkFeature,
  createLiveInlineMarkKeymap,
  type LiveInlineMarkSpec,
} from "./live-inline-mark.ts";

const CONFIG = {
  mark: "strong",
  delimiter: "**",
  liveClass: "md-live-strong",
} satisfies LiveInlineMarkSpec;

const ESCAPED_PENDING_MARKER = /\\?\*\\?\*([^*\s\\]+)\\?\*\\?\*/g;

export function serializeLiveStrongPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "**$1**");
}

export function strongKeymap(schema: Schema): Record<string, Command> {
  return createLiveInlineMarkKeymap(schema, CONFIG);
}

export function liveStrong(schema: Schema) {
  return createLiveInlineMarkFeature(schema, CONFIG);
}
