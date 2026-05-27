import type { LiveInlineMarkSpec } from "./live-inline-mark.ts";

export const liveCodeSpec = {
  mark: "code",
  delimiter: "`",
  liveClass: "md-live-code",
  allowDelimiterFallback: true,
} satisfies LiveInlineMarkSpec;

const ESCAPED_PENDING_MARKER = /\\`([^`\s\\]+)\\`/g;

export function serializeLiveCodePendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "`$1`");
}
