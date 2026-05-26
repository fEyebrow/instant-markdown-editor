import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveCodeSpec = {
  id: "live-code",
  title: "Live Code",
  cases: [
    {
      id: "live-code-basic",
      title: "Basic commit flow",
      initialMarkdown: "|",
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
          expectedMarkdown: "`1`\u00a0",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
