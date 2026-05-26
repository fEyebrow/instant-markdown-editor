import type { Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { liveInlineMark, reopenPendingInlineMarkOnBackspace } from "./live-inline-mark.ts";

const CONFIG = {
  mark: "strong",
  open: "**",
  close: "**",
  pending: /(?<!\*)\*\*([^*\s]+)\*\*(?!\*)/g,
  commit: /(?<!\*)\*\*([^*\s]+)\*\*(?!\*)([ \u00a0]|[^*])$/,
  liveClass: "md-live-strong",
};

const ESCAPED_PENDING_MARKER = /\\?\*\\?\*([^*\s\\]+)\\?\*\\?\*/g;

export function serializeLiveStrongPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "**$1**");
}

export function strongKeymap(schema: Schema): Record<string, Command> {
  return {
    Backspace: reopenPendingInlineMarkOnBackspace(schema, CONFIG),
  };
}

export function liveStrong(schema: Schema) {
  return liveInlineMark(schema, CONFIG);
}
