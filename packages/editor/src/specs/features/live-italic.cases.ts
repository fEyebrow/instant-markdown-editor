import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveItalicSpec = {
  id: "live-italic",
  title: "Live Italic",
  cases: [
    {
      id: "live-italic-basic",
      title: "Basic commit flow",
      initialMarkdown: "|",
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
      id: "live-italic-reopen-pending-before-space",
      title: "Reopen pending markers before trailing space",
      initialMarkdown: "\\*1\\*|",
      keyevents: [" ", "Backspace"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<p><pending>*</pending><i>1</i><pending>*</pending>|</p>",
          expectedMarkdown: "*1*",
        },
      ],
    },
    {
      id: "live-italic-fallback-from-unclosed-strong",
      title: "Fallback from unclosed strong",
      initialMarkdown: "|",
      keyevents: ["*", "*", "1", "*", " "],
      checkpoints: [
        {
          step: 4,
          expectedProjection: "<p>*<pending>*</pending><i>1</i><pending>*</pending>|</p>",
          expectedMarkdown: "\\**1*",
        },
        {
          step: 5,
          expectedProjection: "<p>*<i>1</i> |</p>",
          expectedMarkdown: "\\**1*\u00a0",
        },
      ],
    },
    {
      id: "live-italic-commit-before-plain-text",
      title: "Commit before plain text",
      initialMarkdown: "|",
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
      id: "live-italic-commit-when-cursor-leaves-source",
      title: "Commit when cursor leaves source",
      initialMarkdown: "\\*1\\*|x",
      keyevents: ["ArrowRight"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><i>1</i>x|</p>",
          expectedMarkdown: "*1*x",
        },
      ],
    },
    {
      id: "live-italic-keeps-source-before-current-delimiter",
      title: "Keep source before current delimiter",
      initialMarkdown: "|",
      keyevents: ["*", "1", "*", "*"],
      checkpoints: [
        {
          step: 4,
          expectedProjection: "<p>*1**|</p>",
          expectedMarkdown: "*1*\\*",
        },
      ],
    },
    {
      id: "live-italic-reveal-pending-at-mark-boundaries",
      title: "Reveal pending markers at mark boundaries",
      initialMarkdown: "|",
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
          title: "cursor reaches mark start",
          expectedProjection: "<p>|<pending>*</pending><i>1</i><pending>*</pending> </p>",
          expectedMarkdown: "*1*\u00a0",
        },
      ],
    },
    {
      id: "live-italic-arrow-left-before-trailing-text",
      title: "Arrow left enters only the trailing text boundary",
      initialMarkdown: "*d*|x",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><pending>*</pending><i>d</i>|<pending>*</pending>x</p>",
          expectedMarkdown: "*d*x",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
