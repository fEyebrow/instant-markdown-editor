import type MarkdownIt from "markdown-it";
import type { MarkSpec, Schema } from "prosemirror-model";
import type { Command, Plugin } from "prosemirror-state";
import { atxHeadingFeature } from "./atx-heading.ts";
import { autolink } from "./autolink.ts";
import { blockquote } from "./blockquote.ts";
import { code } from "./code.ts";
import { emphasis } from "./emphasis.ts";
import { highlight } from "./highlight.ts";
import { image } from "./image.ts";
import { createInlineNormalizePlugins } from "./inline-normalize.ts";
import type { InlineFeatureSpec } from "./inline-parse.ts";
import { link } from "./link.ts";
import { orderedList } from "./ordered-list.ts";
import { strikethrough } from "./strikethrough.ts";
import { subscript } from "./subscript.ts";
import { superscript } from "./superscript.ts";
import { thematicBreak } from "./thematic-break.ts";
import type { FeatureSpec, MarkdownTokenHandler } from "./_types.ts";
import { unorderedList } from "./unordered-list.ts";

export const featureSpecs: FeatureSpec[] = [
  image,
  link,
  strikethrough,
  subscript,
  superscript,
  highlight,
  emphasis,
  code,
  thematicBreak,
  atxHeadingFeature,
  autolink,
  unorderedList,
  orderedList,
  blockquote,
];

export const featureMarkSpecs: Record<string, MarkSpec> = Object.assign(
  {},
  ...featureSpecs.map((feature) => feature.marks ?? {}),
);

export function collectMarks(): Record<string, MarkSpec> {
  return featureMarkSpecs;
}

export const featureParserTokens: Record<string, MarkdownTokenHandler> = Object.assign(
  {},
  ...featureSpecs.map((feature) => feature.parserTokens ?? {}),
);

export function configureFeatureMarkdownIt(tokenizer: MarkdownIt): void {
  for (const plugin of collectMdItPlugins()) plugin(tokenizer);
}

export function collectMdItPlugins(): Array<(tokenizer: MarkdownIt) => void> {
  return featureSpecs.flatMap((feature) => feature.mdItPlugins ?? []);
}

export function collectParserTokens(): Record<string, MarkdownTokenHandler> {
  return featureParserTokens;
}

export function createFeaturePlugins(schema: Schema): Plugin[] {
  return [
    ...createInlineNormalizePlugins(schema, collectInlineFeatures()),
    ...collectPlugins(schema),
  ];
}

export function collectInlineFeatures(): InlineFeatureSpec[] {
  return featureSpecs
    .flatMap((feature) => (feature.inline ? [feature.inline] : []))
    .sort((a, b) => a.priority - b.priority);
}

export function createFeatureKeymaps(schema: Schema): Record<string, Command>[] {
  return collectKeymaps(schema);
}

export function collectPlugins(schema: Schema): Plugin[] {
  return featureSpecs.flatMap((feature) => feature.plugins?.(schema) ?? []);
}

export function collectKeymaps(schema: Schema): Record<string, Command>[] {
  return featureSpecs.flatMap((feature) => feature.keymaps?.(schema) ?? []);
}
