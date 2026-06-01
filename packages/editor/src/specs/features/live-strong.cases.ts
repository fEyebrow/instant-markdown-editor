import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveStrongSpec = {
  id: "live-strong",
  title: "Live Strong",
  cases: [
    {
      id: "live-strong-basic",
      title: "Basic Method-B flow",
      initialMarkdown: "",
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
          expectedMarkdown: "**1** ",
        },
      ],
    },
    {
      id: "live-strong-hides-source-before-plain-text",
      title: "Hide source before plain text",
      initialMarkdown: "",
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
      id: "live-strong-projects-inside-highlight-source-layer",
      title: "Commits inside highlight source layer",
      initialMarkdown: "",
      keyevents: ["=", "=", "*", "*", "1", "*", "*", "=", "=", " "],
      checkpoints: [
        {
          step: 10,
          expectedProjection: "<p><mark><b>1</b></mark> |</p>",
          expectedMarkdown: "==**1**== ",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
