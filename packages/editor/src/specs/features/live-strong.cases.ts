import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveStrongSpec = {
  id: "live-strong",
  title: "Live Strong",
  cases: [
    {
      id: "live-strong-source-projects",
      title: "'**1**' projects as strong source and serializes as Markdown",
      initialMarkdown: "",
      keyevents: ["*", "*", "1", "*", "*"],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>**</pending><b>1</b><pending>**</pending>|</p>",
          expectedMarkdown: "**1**",
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
