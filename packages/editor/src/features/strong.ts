const ESCAPED_PENDING_MARKER = /\\?\*\\?\*([^*\s\\]+)\\?\*\\?\*/g;

export function serializeLiveStrongPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "**$1**");
}
