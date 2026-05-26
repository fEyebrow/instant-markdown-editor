import type { MarkSpec, Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import {
  liveInlineMark,
  reopenPendingInlineMarkOnArrow,
  reopenPendingInlineMarkOnBackspace,
} from "./live-inline-mark.ts";

export const highlightMarkSpecs = {
  highlight: {
    parseDOM: [{ tag: "mark" }],
    toDOM() {
      return ["mark"];
    },
  } as MarkSpec,
};

export const highlightMarkdownParseSpecs = {
  mark: { mark: "highlight" },
};

export const highlightMarkdownSerializeSpecs = {
  highlight: { open: "==", close: "==", expelEnclosingWhitespace: true },
};

export const highlightMarkRankEntries: [string, number][] = [["highlight", 2.75]];

const CONFIG = {
  mark: "highlight",
  open: "==",
  close: "==",
  pending: /(?<!=)==([^=\s]+)==(?!=)/g,
  commit: /(?<!=)==([^=\s]+)==(?!=)([ \u00a0]|[^=])$/,
  liveClass: "md-live-highlight",
};

const ESCAPED_PENDING_MARKER = /\\?=\\?=([^=\s\\]+)\\?=\\?=/g;

export function serializeLiveHighlightPendingMarkdown(markdown: string): string {
  return markdown.replace(ESCAPED_PENDING_MARKER, "==$1==");
}

export function highlightKeymap(schema: Schema): Record<string, Command> {
  return {
    ArrowLeft: reopenPendingInlineMarkOnArrow(schema, CONFIG, "left"),
    ArrowRight: reopenPendingInlineMarkOnArrow(schema, CONFIG, "right"),
    Backspace: reopenPendingInlineMarkOnBackspace(schema, CONFIG),
  };
}

export function liveHighlight(schema: Schema) {
  return liveInlineMark(schema, CONFIG);
}
