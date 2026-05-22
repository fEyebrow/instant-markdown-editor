import type { Schema } from "prosemirror-model";
import { listKeymap } from "./list.ts";
import {
  italicMarkdownParseSpecs,
  italicMarkdownSerializeSpecs,
  italicMarkRankEntries,
  italicMarkSpecs,
  liveItalic,
} from "./italic.ts";
import { thematicBreakKeymap } from "./thematic-break.ts";

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

export function createFeaturePlugins(schema: Schema) {
  return [liveItalic(schema)];
}

export function createFeatureKeymaps(schema: Schema) {
  return [thematicBreakKeymap, listKeymap(schema)];
}
