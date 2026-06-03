import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveCodeSpec = {
  id: "live-code",
  title: "Live Code",
  cases: [
    {
      id: "live-code-source-projects",
      title: "'`1`' projects as inline code source and serializes as Markdown",
      initialMarkdown: "",
      keyevents: ["`", "1", "`"],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p><pending>`</pending><code>1</code><pending>`</pending>|</p>",
          expectedMarkdown: "`1`",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
