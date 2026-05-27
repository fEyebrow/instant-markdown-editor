import type { Schema } from "prosemirror-model";
import type { Command, Plugin } from "prosemirror-state";
import { atxHeading, atxHeadingKeymap } from "./atx-heading.ts";
import { autolinkKeymap, liveAutolink } from "./autolink.ts";
import { blockquoteInputRules } from "./blockquote.ts";
import { liveCodeSpec, serializeLiveCodePendingMarkdown } from "./code.ts";
import {
  highlightMarkdownParseSpecs,
  highlightMarkdownSerializeSpecs,
  highlightMarkRankEntries,
  highlightMarkSpecs,
  liveHighlightSpec,
  serializeLiveHighlightPendingMarkdown,
} from "./highlight.ts";
import {
  italicMarkdownParseSpecs,
  italicMarkdownSerializeSpecs,
  italicMarkRankEntries,
  italicMarkSpecs,
  liveItalicSpec,
  serializeLiveItalicPendingMarkdown,
} from "./italic.ts";
import {
  createLiveInlineMarkFeatures,
  createLiveInlineMarkKeymapController,
  type LiveInlineMarkSpec,
} from "./live-inline-mark.ts";
import {
  liveStrikethroughSpec,
  serializeLiveStrikethroughPendingMarkdown,
  strikethroughMarkdownParseSpecs,
  strikethroughMarkdownSerializeSpecs,
  strikethroughMarkRankEntries,
  strikethroughMarkSpecs,
} from "./strikethrough.ts";
import {
  liveSubscriptSpec,
  serializeLiveSubscriptPendingMarkdown,
  subscriptMarkdownParseSpecs,
  subscriptMarkdownSerializeSpecs,
  subscriptMarkRankEntries,
  subscriptMarkSpecs,
} from "./subscript.ts";
import {
  liveSuperscriptSpec,
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
import { liveStrongSpec, serializeLiveStrongPendingMarkdown } from "./strong.ts";
import { thematicBreakKeymap, thematicBreakLeaveLine } from "./thematic-break.ts";
import { orderedListInputRules } from "./ordered-list.ts";
import { unorderedListInputRules, unorderedListKeymap } from "./unordered-list.ts";

const liveInlineMarkSpecs = [
  liveItalicSpec,
  liveStrongSpec,
  liveStrikethroughSpec,
  liveSubscriptSpec,
  liveSuperscriptSpec,
  liveHighlightSpec,
] satisfies readonly LiveInlineMarkSpec[];

const liveCodeSpecs = [liveCodeSpec] satisfies readonly LiveInlineMarkSpec[];

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
    ...createLiveInlineMarkFeatures(schema, liveInlineMarkSpecs),
    liveImage(schema),
    liveEmoji(schema),
    liveTaskItem(schema),
    taskItemInputRules(schema),
    liveLink(schema),
    liveAutolink(schema),
    ...createLiveInlineMarkFeatures(schema, liveCodeSpecs),
    thematicBreakLeaveLine(schema),
    atxHeading(schema),
    unorderedListInputRules(schema),
    orderedListInputRules(schema),
    blockquoteInputRules(schema),
  ];
}

export function createFeatureKeymaps(schema: Schema): Record<string, Command>[] {
  return [
    thematicBreakKeymap,
    atxHeadingKeymap,
    createLiveInlineMarkKeymapController(schema, liveInlineMarkSpecs),
    imageKeymap(schema),
    emojiKeymap(schema),
    autolinkKeymap(schema),
    linkKeymap(schema),
    createLiveInlineMarkKeymapController(schema, liveCodeSpecs),
    unorderedListKeymap(schema),
    taskItemKeymap(schema),
  ];
}
