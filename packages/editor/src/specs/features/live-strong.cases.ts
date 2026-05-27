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
    {
      id: "live-strong-arrow-left-before-trailing-text",
      title: "Arrow left enters only the trailing text boundary",
      initialMarkdown: "**d**|x",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><pending>**</pending><b>d</b><pending>*|*</pending>x</p>",
          expectedMarkdown: "**d**x",
        },
      ],
    },
    {
      id: "live-strong-commits-inside-highlight-source-layer",
      title: "Commits inside highlight source layer",
      initialMarkdown: "|",
      keyevents: ["=", "=", "*", "*", "1", "*", "*", "=", "=", " "],
      checkpoints: [
        {
          step: 10,
          expectedProjection: "<p><mark><b>1</b></mark> |</p>",
          expectedMarkdown: "**==1==**\u00a0",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
