import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveHighlightSpec = {
  id: "live-highlight",
  title: "Live Highlight",
  cases: [
    {
      id: "live-highlight-source-projects",
      title: "'==1==' projects as highlight source and serializes as Markdown",
      initialMarkdown: "",
      keyevents: ["=", "=", "1", "=", "="],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>==</pending><mark>1</mark><pending>==</pending>|</p>",
          expectedMarkdown: "==1==",
        },
      ],
    },
    {
      id: "live-highlight-empty-source-stays-text",
      title: "Empty source stays plain text",
      initialMarkdown: "",
      keyevents: ["=", "=", "=", "="],
      checkpoints: [
        {
          step: 4,
          expectedProjection: "<p>====|</p>",
          expectedMarkdown: "====",
        },
      ],
    },
    {
      id: "live-highlight-does-not-cross-lines",
      title: "Does not cross lines",
      initialMarkdown: "",
      keyevents: ["=", "=", "1", "Enter", "1", "=", "="],
      checkpoints: [
        {
          step: 7,
          expectedProjection: "<p>==1</p><p>1==|</p>",
          expectedMarkdown: "==1\n\n1==",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
