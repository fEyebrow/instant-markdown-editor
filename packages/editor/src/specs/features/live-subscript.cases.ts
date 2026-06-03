import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveSubscriptSpec = {
  id: "live-subscript",
  title: "Live Subscript",
  cases: [
    {
      id: "live-subscript-source-projects",
      title: "'~1~' projects as subscript source and serializes as Markdown",
      initialMarkdown: "",
      keyevents: ["~", "1", "~"],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p><pending>~</pending><sub>1</sub><pending>~</pending>|</p>",
          expectedMarkdown: "~1~",
        },
      ],
    },
    {
      id: "live-subscript-preserves-strikethrough-priority",
      title: "Preserves strikethrough priority",
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
    {
      id: "live-subscript-empty-source-stays-text",
      title: "Empty and blank source stays plain text",
      initialMarkdown: "",
      keyevents: ["~", "~", "ArrowLeft", " ", "ArrowRight"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<p>~~|</p>",
          expectedMarkdown: "~~",
        },
        {
          step: 5,
          expectedProjection: "<p>~ ~|</p>",
          expectedMarkdown: "~ ~",
        },
      ],
    },
    {
      id: "live-subscript-markdown-round-trip",
      title: "Markdown subscript parses and serializes as subscript",
      initialMarkdown: "~1~ a",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><sub>1</sub> |a</p>",
          expectedMarkdown: "~1~ a",
        },
      ],
    },
    {
      id: "live-subscript-does-not-cross-lines",
      title: "Does not cross lines",
      initialMarkdown: "",
      keyevents: ["~", "1", "Enter", "1", "~"],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p>~1</p><p>1~|</p>",
          expectedMarkdown: "~1\n\n1~",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
