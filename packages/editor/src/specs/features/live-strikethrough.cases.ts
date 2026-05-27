import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveStrikethroughSpec = {
  id: "live-strikethrough",
  title: "Live Strikethrough",
  cases: [
    {
      id: "live-strikethrough-basic",
      title: "Basic commit flow",
      initialMarkdown: "|",
      keyevents: ["~", "~", "1", "~", "~", " "],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>~~</pending><s>1</s><pending>~~</pending>|</p>",
          expectedMarkdown: "~~1~~",
        },
        {
          step: 6,
          expectedProjection: "<p><s>1</s> |</p>",
          expectedMarkdown: "~~1~~\u00a0",
        },
      ],
    },
    {
      id: "live-strikethrough-reopen-pending-before-space",
      title: "Reopen pending markers before trailing space",
      initialMarkdown: "\\~\\~1\\~\\~|",
      keyevents: [" ", "Backspace"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<p><pending>~~</pending><s>1</s><pending>~~</pending>|</p>",
          expectedMarkdown: "~~1~~",
        },
      ],
    },
    {
      id: "live-strikethrough-commit-before-plain-text",
      title: "Commit before plain text",
      initialMarkdown: "|",
      keyevents: ["~", "~", "1", "~", "~", "a"],
      checkpoints: [
        {
          step: 6,
          expectedProjection: "<p><s>1</s>a|</p>",
          expectedMarkdown: "~~1~~a",
        },
      ],
    },
    {
      id: "live-strikethrough-reveal-pending-at-mark-boundaries",
      title: "Reveal pending markers at mark boundaries",
      initialMarkdown: "|",
      keyevents: ["~", "~", "1", "~", "~", " ", "ArrowLeft", "ArrowLeft"],
      checkpoints: [
        {
          step: 7,
          title: "cursor reaches mark end",
          expectedProjection: "<p><pending>~~</pending><s>1</s><pending>~~</pending>| </p>",
          expectedMarkdown: "~~1~~\u00a0",
        },
        {
          step: 8,
          title: "cursor moves through closing delimiter",
          expectedProjection: "<p><pending>~~</pending><s>1</s><pending>~|~</pending> </p>",
          expectedMarkdown: "~~1~~\u00a0",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
