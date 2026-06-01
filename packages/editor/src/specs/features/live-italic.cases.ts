import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveItalicSpec = {
  id: "live-italic",
  title: "Live Italic",
  cases: [
    {
      id: "live-italic-basic",
      title: "Basic commit flow",
      initialMarkdown: "",
      keyevents: ["*", "1", "*", " "],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p><pending>*</pending><i>1</i><pending>*</pending>|</p>",
          expectedMarkdown: "*1*",
        },
        {
          step: 4,
          expectedProjection: "<p><i>1</i> |</p>",
          expectedMarkdown: "*1*\u00a0",
        },
      ],
    },
    {
      id: "live-italic-commit-before-plain-text",
      title: "Commit before plain text",
      initialMarkdown: "",
      keyevents: ["*", "1", "*", "a"],
      checkpoints: [
        {
          step: 4,
          expectedProjection: "<p><i>1</i>a|</p>",
          expectedMarkdown: "*1*a",
        },
      ],
    },
    {
      id: "live-italic-reveal-pending-at-mark-boundaries",
      title: "Reveal pending markers at mark boundaries",
      initialMarkdown: "",
      keyevents: ["*", "1", "*", " ", "ArrowLeft", "ArrowLeft"],
      checkpoints: [
        {
          step: 5,
          title: "cursor reaches mark end",
          expectedProjection: "<p><pending>*</pending><i>1</i><pending>*</pending>| </p>",
          expectedMarkdown: "*1*\u00a0",
        },
        {
          step: 6,
          title: "cursor moves through closing delimiter",
          expectedProjection: "<p><pending>*</pending><i>1</i>|<pending>*</pending> </p>",
          expectedMarkdown: "*1*\u00a0",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
