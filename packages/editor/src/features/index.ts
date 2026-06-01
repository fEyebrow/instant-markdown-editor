import type { Schema } from "prosemirror-model";
import type { Command, Plugin } from "prosemirror-state";
import { atxHeading, atxHeadingKeymap } from "./atx-heading.ts";
import { autolinkKeymap, liveAutolink } from "./autolink.ts";
import { blockquoteInputRules } from "./blockquote.ts";
import { serializeLiveCodePendingMarkdown } from "./code.ts";
import {
  highlightMarkdownParseSpecs,
  highlightMarkdownSerializeSpecs,
  highlightMarkRankEntries,
  highlightMarkSpecs,
  serializeLiveHighlightPendingMarkdown,
} from "./highlight.ts";
import {
  italicMarkdownParseSpecs,
  italicMarkdownSerializeSpecs,
  italicMarkRankEntries,
  italicMarkSpecs,
  serializeLiveItalicPendingMarkdown,
} from "./italic.ts";
import { createInlineNormalizePlugins } from "./inline-normalize.ts";
import type { InlineFeatureSpec } from "./inline-parse.ts";
import { inlineFeatureSpecs } from "./inline-scanners.ts";
import {
  serializeLiveStrikethroughPendingMarkdown,
  strikethroughMarkdownParseSpecs,
  strikethroughMarkdownSerializeSpecs,
  strikethroughMarkRankEntries,
  strikethroughMarkSpecs,
} from "./strikethrough.ts";
import {
  serializeLiveSubscriptPendingMarkdown,
  subscriptMarkdownParseSpecs,
  subscriptMarkdownSerializeSpecs,
  subscriptMarkRankEntries,
  subscriptMarkSpecs,
} from "./subscript.ts";
import {
  serializeLiveSuperscriptPendingMarkdown,
  superscriptMarkdownParseSpecs,
  superscriptMarkdownSerializeSpecs,
  superscriptMarkRankEntries,
  superscriptMarkSpecs,
} from "./superscript.ts";
import { linkKeymap, liveLink, serializeLiveLinkPendingMarkdown } from "./link.ts";
import { imageKeymap, liveImage } from "./image.ts";
import { emojiKeymap, liveEmoji } from "./emoji.ts";
import { liveTaskItem, taskItemInputRules, taskItemKeymap } from "./task-item.ts";
import { serializeLiveStrongPendingMarkdown } from "./strong.ts";
import { thematicBreakKeymap, thematicBreakLeaveLine } from "./thematic-break.ts";
import { orderedListInputRules } from "./ordered-list.ts";
import { unorderedListInputRules, unorderedListKeymap } from "./unordered-list.ts";

export const featureMarkSpecs = {
  ...italicMarkSpecs,
  ...strikethroughMarkSpecs,
  ...subscriptMarkSpecs,
  ...superscriptMarkSpecs,
  ...highlightMarkSpecs,
};

export const featureMarkdownParseSpecs = {
  ...italicMarkdownParseSpecs,
  ...strikethroughMarkdownParseSpecs,
  ...subscriptMarkdownParseSpecs,
  ...superscriptMarkdownParseSpecs,
  ...highlightMarkdownParseSpecs,
};

export const featureMarkdownSerializeSpecs = {
  ...italicMarkdownSerializeSpecs,
  ...strikethroughMarkdownSerializeSpecs,
  ...subscriptMarkdownSerializeSpecs,
  ...superscriptMarkdownSerializeSpecs,
  ...highlightMarkdownSerializeSpecs,
};

export const featureMarkRankEntries = [
  ...italicMarkRankEntries,
  ...strikethroughMarkRankEntries,
  ...subscriptMarkRankEntries,
  ...superscriptMarkRankEntries,
  ...highlightMarkRankEntries,
];

export function serializeFeatureMarkdown(markdown: string): string {
  return serializeLiveLinkPendingMarkdown(
    serializeLiveHighlightPendingMarkdown(
      serializeLiveSuperscriptPendingMarkdown(
        serializeLiveSubscriptPendingMarkdown(
          serializeLiveCodePendingMarkdown(
            serializeLiveStrongPendingMarkdown(
              serializeLiveStrikethroughPendingMarkdown(
                serializeLiveItalicPendingMarkdown(markdown),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

export function createFeaturePlugins(schema: Schema): Plugin[] {
  return [
    ...createInlineNormalizePlugins(schema),
    liveImage(schema),
    liveEmoji(schema),
    liveTaskItem(schema),
    taskItemInputRules(schema),
    liveLink(schema),
    liveAutolink(schema),
    thematicBreakLeaveLine(schema),
    atxHeading(schema),
    unorderedListInputRules(schema),
    orderedListInputRules(schema),
    blockquoteInputRules(schema),
  ];
}

export function collectInlineFeatures(): InlineFeatureSpec[] {
  return [...inlineFeatureSpecs].sort((a, b) => a.priority - b.priority);
}

export function createFeatureKeymaps(schema: Schema): Record<string, Command>[] {
  return [
    thematicBreakKeymap,
    atxHeadingKeymap,
    imageKeymap(schema),
    emojiKeymap(schema),
    autolinkKeymap(schema),
    linkKeymap(schema),
    unorderedListKeymap(schema),
    taskItemKeymap(schema),
  ];
}
