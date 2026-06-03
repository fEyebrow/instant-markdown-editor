import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveItalicSpec = {
  id: "live-italic",
  title: "Live Italic",
  cases: [
    {
      id: "live-italic-source-projects",
      title: "'*1*' projects as italic source and serializes as Markdown",
      initialMarkdown: "",
      keyevents: ["*", "1", "*"],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p><pending>*</pending><i>1</i><pending>*</pending>|</p>",
          expectedMarkdown: "*1*",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
