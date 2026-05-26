import { defineEditorSpecFeatures } from "./define.ts";
import { liveItalicSpec } from "./features/live-italic.cases.ts";
import { liveStrongSpec } from "./features/live-strong.cases.ts";
import { liveStrikethroughSpec } from "./features/live-strikethrough.cases.ts";
import { thematicBreakSpec } from "./features/thematic-break.cases.ts";
import { liveCodeSpec } from "./features/live-code.cases.ts";
import { unorderedListSpec } from "./features/unordered-list.cases.ts";
import { orderedListSpec } from "./features/ordered-list.cases.ts";
import { atxHeadingSpec } from "./features/atx-heading.cases.ts";
import { blockquoteSpec } from "./features/blockquote.cases.ts";

const EDITOR_SPEC_FEATURE_DEFINITIONS = [
  liveItalicSpec,
  liveStrongSpec,
  liveStrikethroughSpec,
  thematicBreakSpec,
  liveCodeSpec,
  unorderedListSpec,
  orderedListSpec,
  atxHeadingSpec,
  blockquoteSpec,
];

export const EDITOR_SPEC_FEATURES = defineEditorSpecFeatures(EDITOR_SPEC_FEATURE_DEFINITIONS);

export type { EditorSpecCase, EditorSpecCheckpoint, EditorSpecFeature } from "./types.ts";
