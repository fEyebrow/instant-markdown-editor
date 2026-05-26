import type { Schema } from "prosemirror-model";
import { atxHeading, atxHeadingKeymap } from "./atx-heading.ts";
import { blockquoteInputRules } from "./blockquote.ts";
import { codeKeymap, liveCode, serializeLiveCodePendingMarkdown } from "./code.ts";
import {
  highlightKeymap,
  highlightMarkdownParseSpecs,
  highlightMarkdownSerializeSpecs,
  highlightMarkRankEntries,
  highlightMarkSpecs,
  liveHighlight,
  serializeLiveHighlightPendingMarkdown,
} from "./highlight.ts";
import {
  italicKeymap,
  italicMarkdownParseSpecs,
  italicMarkdownSerializeSpecs,
  italicMarkRankEntries,
  italicMarkSpecs,
  liveItalic,
  serializeLiveItalicPendingMarkdown,
} from "./italic.ts";
import {
  liveStrikethrough,
  serializeLiveStrikethroughPendingMarkdown,
  strikethroughKeymap,
  strikethroughMarkdownParseSpecs,
  strikethroughMarkdownSerializeSpecs,
  strikethroughMarkRankEntries,
  strikethroughMarkSpecs,
} from "./strikethrough.ts";
import {
  liveSubscript,
  serializeLiveSubscriptPendingMarkdown,
  subscriptKeymap,
  subscriptMarkdownParseSpecs,
  subscriptMarkdownSerializeSpecs,
  subscriptMarkRankEntries,
  subscriptMarkSpecs,
} from "./subscript.ts";
import { liveStrong, serializeLiveStrongPendingMarkdown, strongKeymap } from "./strong.ts";
import { thematicBreakKeymap, thematicBreakLeaveLine } from "./thematic-break.ts";
import { orderedListInputRules } from "./ordered-list.ts";
import { unorderedListInputRules, unorderedListKeymap } from "./unordered-list.ts";

export const featureMarkSpecs = {
  ...italicMarkSpecs,
  ...strikethroughMarkSpecs,
  ...subscriptMarkSpecs,
  ...highlightMarkSpecs,
};

export const featureMarkdownParseSpecs = {
  ...italicMarkdownParseSpecs,
  ...strikethroughMarkdownParseSpecs,
  ...subscriptMarkdownParseSpecs,
  ...highlightMarkdownParseSpecs,
};

export const featureMarkdownSerializeSpecs = {
  ...italicMarkdownSerializeSpecs,
  ...strikethroughMarkdownSerializeSpecs,
  ...subscriptMarkdownSerializeSpecs,
  ...highlightMarkdownSerializeSpecs,
};

export const featureMarkRankEntries = [
  ...italicMarkRankEntries,
  ...strikethroughMarkRankEntries,
  ...subscriptMarkRankEntries,
  ...highlightMarkRankEntries,
];

export function serializeFeatureMarkdown(markdown: string): string {
  return serializeLiveHighlightPendingMarkdown(
    serializeLiveSubscriptPendingMarkdown(
      serializeLiveCodePendingMarkdown(
        serializeLiveStrongPendingMarkdown(
          serializeLiveStrikethroughPendingMarkdown(serializeLiveItalicPendingMarkdown(markdown)),
        ),
      ),
    ),
  );
}

export function createFeaturePlugins(schema: Schema) {
  return [
    liveItalic(schema),
    liveStrong(schema),
    liveStrikethrough(schema),
    liveSubscript(schema),
    liveHighlight(schema),
    liveCode(schema),
    thematicBreakLeaveLine(schema),
    atxHeading(schema),
    unorderedListInputRules(schema),
    orderedListInputRules(schema),
    blockquoteInputRules(schema),
  ];
}

export function createFeatureKeymaps(schema: Schema) {
  return [
    thematicBreakKeymap,
    atxHeadingKeymap,
    italicKeymap(schema),
    strongKeymap(schema),
    strikethroughKeymap(schema),
    subscriptKeymap(schema),
    highlightKeymap(schema),
    codeKeymap(schema),
    unorderedListKeymap(schema),
  ];
}
