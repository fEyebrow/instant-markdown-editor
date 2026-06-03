import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveStrikethroughSpec = {
  id: "live-strikethrough",
  title: "Live Strikethrough",
  cases: [
    {
      id: "live-strikethrough-source-projects",
      title: "'~~1~~' projects as strikethrough source and serializes as Markdown",
      initialMarkdown: "",
      keyevents: ["~", "~", "1", "~", "~"],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>~~</pending><s>1</s><pending>~~</pending>|</p>",
          expectedMarkdown: "~~1~~",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
