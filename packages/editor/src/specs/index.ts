import { defineEditorSpecFeatures } from "./define.ts";
import { liveInlineMarkSpec } from "./features/live-inline-mark.cases.ts";
import { liveItalicSpec } from "./features/live-italic.cases.ts";
import { liveStrongSpec } from "./features/live-strong.cases.ts";
import { liveStrikethroughSpec } from "./features/live-strikethrough.cases.ts";
import { liveHighlightSpec } from "./features/live-highlight.cases.ts";
import { liveSubscriptSpec } from "./features/live-subscript.cases.ts";
import { liveSuperscriptSpec } from "./features/live-superscript.cases.ts";
import { liveLinkSpec } from "./features/live-link.cases.ts";
import { liveAutolinkSpec } from "./features/live-autolink.cases.ts";
import { liveImageSpec } from "./features/live-image.cases.ts";
import { emojiSpec } from "./features/emoji.cases.ts";
import { taskItemSpec } from "./features/task-item.cases.ts";
import { thematicBreakSpec } from "./features/thematic-break.cases.ts";
import { liveCodeSpec } from "./features/live-code.cases.ts";
import { unorderedListSpec } from "./features/unordered-list.cases.ts";
import { orderedListSpec } from "./features/ordered-list.cases.ts";
import { atxHeadingSpec } from "./features/atx-heading.cases.ts";
import { blockquoteSpec } from "./features/blockquote.cases.ts";

const EDITOR_SPEC_FEATURE_DEFINITIONS = [
  liveInlineMarkSpec,
  liveItalicSpec,
  liveStrongSpec,
  liveStrikethroughSpec,
  liveHighlightSpec,
  liveSubscriptSpec,
  liveSuperscriptSpec,
  liveLinkSpec,
  liveAutolinkSpec,
  liveImageSpec,
  emojiSpec,
  taskItemSpec,
  thematicBreakSpec,
  liveCodeSpec,
  unorderedListSpec,
  orderedListSpec,
  atxHeadingSpec,
  blockquoteSpec,
];

export const EDITOR_SPEC_FEATURES = defineEditorSpecFeatures(EDITOR_SPEC_FEATURE_DEFINITIONS);

export type { EditorSpecCase, EditorSpecCheckpoint, EditorSpecFeature } from "./types.ts";
