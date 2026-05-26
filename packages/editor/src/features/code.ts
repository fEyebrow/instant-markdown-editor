import type { Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { liveInlineMark, reopenPendingInlineMarkOnBackspace } from "./live-inline-mark.ts";

const CONFIG = {
  mark: "code",
  open: "`",
  close: "`",
  pending: /`([^`\s]+)`/g,
  commit: /`([^`\s]+)`([ \u00a0]|[^`])$/,
  liveClass: "md-live-code",
};

const ESCAPED_PENDING_MARKER = /\\`([^`\s\\]+)\\`/g;

export function serializeLiveCodePendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "`$1`");
}

export function codeKeymap(schema: Schema): Record<string, Command> {
  return {
    Backspace: reopenPendingInlineMarkOnBackspace(schema, CONFIG),
  };
}

export function liveCode(schema: Schema) {
  return liveInlineMark(schema, CONFIG);
}
