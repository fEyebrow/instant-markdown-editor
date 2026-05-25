import type { Schema } from "prosemirror-model";
import { codeKeymap, liveCode, serializeLiveCodePendingMarkdown } from "./code.ts";
import { listKeymap } from "./list.ts";
import {
  italicKeymap,
  italicMarkdownParseSpecs,
  italicMarkdownSerializeSpecs,
  italicMarkRankEntries,
  italicMarkSpecs,
  liveItalic,
  serializeLiveItalicPendingMarkdown,
} from "./italic.ts";
import { liveStrong, serializeLiveStrongPendingMarkdown, strongKeymap } from "./strong.ts";
import { thematicBreakKeymap, thematicBreakLeaveLine } from "./thematic-break.ts";

export const featureMarkSpecs = {
  ...italicMarkSpecs,
};

export const featureMarkdownParseSpecs = {
  ...italicMarkdownParseSpecs,
};

export const featureMarkdownSerializeSpecs = {
  ...italicMarkdownSerializeSpecs,
};

export const featureMarkRankEntries = [...italicMarkRankEntries];

export function serializeFeatureMarkdown(markdown: string): string {
  return serializeLiveCodePendingMarkdown(
    serializeLiveStrongPendingMarkdown(serializeLiveItalicPendingMarkdown(markdown)),
  );
}

export function createFeaturePlugins(schema: Schema) {
  return [liveItalic(schema), liveStrong(schema), liveCode(schema), thematicBreakLeaveLine(schema)];
}

export function createFeatureKeymaps(schema: Schema) {
  return [
    thematicBreakKeymap,
    italicKeymap(schema),
    strongKeymap(schema),
    codeKeymap(schema),
    listKeymap(schema),
  ];
}
