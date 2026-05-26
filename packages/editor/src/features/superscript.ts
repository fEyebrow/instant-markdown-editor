import type { MarkSpec, Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import {
  createLiveInlineMarkFeature,
  createLiveInlineMarkKeymap,
  type LiveInlineMarkSpec,
} from "./live-inline-mark.ts";

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

const CONFIG = {
  mark: "superscript",
  delimiter: "^",
  liveClass: "md-live-superscript",
} satisfies LiveInlineMarkSpec;

const ESCAPED_PENDING_MARKER = /\\?\^([^^\s\\]+)\\?\^/g;

export function serializeLiveSuperscriptPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "^$1^");
}

export function superscriptKeymap(schema: Schema): Record<string, Command> {
  return createLiveInlineMarkKeymap(schema, CONFIG);
}

export function liveSuperscript(schema: Schema) {
  return createLiveInlineMarkFeature(schema, CONFIG);
}
