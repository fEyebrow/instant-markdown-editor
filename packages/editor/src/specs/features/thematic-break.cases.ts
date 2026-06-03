import type { EditorSpecFeatureDefinition } from "../types.ts";

export const thematicBreakSpec = {
  id: "thematic-break",
  title: "Thematic Break",
  cases: [
    {
      id: "thematic-break-enter-commit",
      title: "Enter on '---' creates hr",
      initialMarkdown: "",
      keyevents: ["-", "-", "-", "Enter"],
      checkpoints: [
        {
          step: 4,
          expectedProjection: "<hr><p>|</p>",
          expectedMarkdown: "---",
        },
      ],
    },
    {
      id: "thematic-break-four-dashes",
      title: "'----' also commits to hr on Enter",
      initialMarkdown: "",
      keyevents: ["-", "-", "-", "-", "Enter"],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<hr><p>|</p>",
          expectedMarkdown: "---",
        },
      ],
    },
    {
      id: "thematic-break-two-dashes",
      title: "'--' stays as plain text on Enter",
      initialMarkdown: "",
      keyevents: ["-", "-", "Enter"],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p>--</p><p>|</p>",
          expectedMarkdown: "--",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
