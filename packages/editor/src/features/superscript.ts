import type { MarkSpec } from "prosemirror-model";

export const superscriptMarkSpecs = {
  superscript: {
    parseDOM: [{ tag: "sup" }],
    toDOM() {
      return ["sup"];
    },
  } as MarkSpec,
};

export const superscriptMarkdownParseSpecs = {
  sup: { mark: "superscript" },
};

export const superscriptMarkdownSerializeSpecs = {
  superscript: { open: "^", close: "^", expelEnclosingWhitespace: true },
};

export const superscriptMarkRankEntries: [string, number][] = [["superscript", 2.65]];

const ESCAPED_PENDING_MARKER = /\\?\^([^^\s\\]+)\\?\^/g;

export function serializeLiveSuperscriptPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "^$1^");
}
