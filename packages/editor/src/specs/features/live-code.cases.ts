import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveCodeSpec = {
  id: "live-code",
  title: "Live Code",
  cases: [
    {
      id: "live-code-basic",
      title: "Basic Method-B flow",
      initialMarkdown: "",
      keyevents: ["`", "1", "`", " "],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p><pending>`</pending><code>1</code><pending>`</pending>|</p>",
          expectedMarkdown: "`1`",
        },
        {
          step: 4,
          expectedProjection: "<p><code>1</code> |</p>",
          expectedMarkdown: "`1` ",
        },
      ],
    },
    {
      id: "live-code-hides-source-before-plain-text",
      title: "Hide source before plain text",
      initialMarkdown: "",
      keyevents: ["`", "1", "`", "a"],
      checkpoints: [
        {
          step: 4,
          expectedProjection: "<p><code>1</code>a|</p>",
          expectedMarkdown: "`1`a",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
