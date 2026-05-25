import type { Schema } from "prosemirror-model";
import { atxHeading, atxHeadingKeymap } from "./atx-heading.ts";
import { blockquoteInputRules } from "./blockquote.ts";
import { codeKeymap, liveCode, serializeLiveCodePendingMarkdown } from "./code.ts";
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
import { liveStrong, serializeLiveStrongPendingMarkdown, strongKeymap } from "./strong.ts";
import { thematicBreakKeymap, thematicBreakLeaveLine } from "./thematic-break.ts";
import { unorderedListInputRules, unorderedListKeymap } from "./unordered-list.ts";

export const featureMarkSpecs = {
  ...italicMarkSpecs,
  ...strikethroughMarkSpecs,
};

export const featureMarkdownParseSpecs = {
  ...italicMarkdownParseSpecs,
  ...strikethroughMarkdownParseSpecs,
};

export const featureMarkdownSerializeSpecs = {
  ...italicMarkdownSerializeSpecs,
  ...strikethroughMarkdownSerializeSpecs,
};

export const featureMarkRankEntries = [...italicMarkRankEntries, ...strikethroughMarkRankEntries];

export function serializeFeatureMarkdown(markdown: string): string {
  return serializeLiveCodePendingMarkdown(
    serializeLiveStrongPendingMarkdown(
      serializeLiveStrikethroughPendingMarkdown(serializeLiveItalicPendingMarkdown(markdown)),
    ),
  );
}

export function createFeaturePlugins(schema: Schema) {
  return [
    liveItalic(schema),
    liveStrong(schema),
    liveStrikethrough(schema),
    liveCode(schema),
    thematicBreakLeaveLine(schema),
    atxHeading(schema),
    unorderedListInputRules(schema),
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
    codeKeymap(schema),
    unorderedListKeymap(schema),
  ];
}
