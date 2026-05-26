import type { Schema } from "prosemirror-model";
import type { Command, Plugin } from "prosemirror-state";
import { atxHeading, atxHeadingKeymap } from "./atx-heading.ts";
import { autolinkKeymap, liveAutolink } from "./autolink.ts";
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
import {
  liveSuperscript,
  serializeLiveSuperscriptPendingMarkdown,
  superscriptKeymap,
  superscriptMarkdownParseSpecs,
  superscriptMarkdownSerializeSpecs,
  superscriptMarkRankEntries,
  superscriptMarkSpecs,
} from "./superscript.ts";
import { linkKeymap, liveLink, serializeLiveLinkPendingMarkdown } from "./link.ts";
import { imageKeymap, liveImage } from "./image.ts";
import { emojiKeymap, liveEmoji } from "./emoji.ts";
import { liveTaskItem, taskItemInputRules, taskItemKeymap } from "./task-item.ts";
import { liveStrong, serializeLiveStrongPendingMarkdown, strongKeymap } from "./strong.ts";
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
    liveItalic(schema),
    liveStrong(schema),
    liveStrikethrough(schema),
    liveSubscript(schema),
    liveSuperscript(schema),
    liveHighlight(schema),
    liveImage(schema),
    liveEmoji(schema),
    liveTaskItem(schema),
    taskItemInputRules(schema),
    liveLink(schema),
    liveAutolink(schema),
    liveCode(schema),
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
    italicKeymap(schema),
    strongKeymap(schema),
    strikethroughKeymap(schema),
    subscriptKeymap(schema),
    superscriptKeymap(schema),
    highlightKeymap(schema),
    imageKeymap(schema),
    emojiKeymap(schema),
    autolinkKeymap(schema),
    linkKeymap(schema),
    codeKeymap(schema),
    unorderedListKeymap(schema),
    taskItemKeymap(schema),
  ];
}
