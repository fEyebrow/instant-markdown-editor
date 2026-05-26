import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveStrongSpec = {
  id: "live-strong",
  title: "Live Strong",
  cases: [
    {
      id: "live-strong-basic",
      title: "Basic commit flow",
      initialMarkdown: "|",
      keyevents: ["*", "*", "1", "*", "*", " "],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>**</pending><b>1</b><pending>**</pending>|</p>",
          expectedMarkdown: "**1**",
        },
        {
          step: 6,
          expectedProjection: "<p><b>1</b> |</p>",
          expectedMarkdown: "**1**\u00a0",
        },
      ],
    },
    {
      id: "live-strong-commit-before-plain-text",
      title: "Commit before plain text",
      initialMarkdown: "|",
      keyevents: ["*", "*", "1", "*", "*", "a"],
      checkpoints: [
        {
          step: 6,
          expectedProjection: "<p><b>1</b>a|</p>",
          expectedMarkdown: "**1**a",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
