import type { LiveInlineMarkSpec } from "./live-inline-mark.ts";

export const liveStrongSpec = {
  mark: "strong",
  delimiter: "**",
  liveClass: "md-live-strong",
} satisfies LiveInlineMarkSpec;

const ESCAPED_PENDING_MARKER = /\\?\*\\?\*([^*\s\\]+)\\?\*\\?\*/g;

export function serializeLiveStrongPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "**$1**");
}
