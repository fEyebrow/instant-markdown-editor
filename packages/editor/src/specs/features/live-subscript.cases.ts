import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveSubscriptSpec = {
  id: "live-subscript",
  title: "Live Subscript",
  cases: [
    {
      id: "live-subscript-basic",
      title: "Basic commit flow",
      initialMarkdown: "|",
      keyevents: ["~", "1", "~", " "],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p><pending>~</pending><sub>1</sub><pending>~</pending>|</p>",
          expectedMarkdown: "~1~",
        },
        {
          step: 4,
          expectedProjection: "<p><sub>1</sub> |</p>",
          expectedMarkdown: "~1~\u00a0",
        },
      ],
    },
    {
      id: "live-subscript-preserves-strikethrough-priority",
      title: "Preserves strikethrough priority",
      initialMarkdown: "|",
      keyevents: ["~", "~", "1", "~", "~", " "],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>~~</pending><s>1</s><pending>~~</pending>|</p>",
          expectedMarkdown: "~~1~~",
        },
        {
          step: 6,
          expectedProjection: "<p><s>1</s> |</p>",
          expectedMarkdown: "~~1~~\u00a0",
        },
      ],
    },
    {
      id: "live-subscript-fallback-from-unclosed-strikethrough",
      title: "Fallback from unclosed strikethrough",
      initialMarkdown: "|",
      keyevents: ["~", "~", "1", "~", " "],
      checkpoints: [
        {
          step: 4,
          expectedProjection: "<p>~<pending>~</pending><sub>1</sub><pending>~</pending>|</p>",
          expectedMarkdown: "\\~~1~",
        },
        {
          step: 5,
          expectedProjection: "<p>~<sub>1</sub> |</p>",
          expectedMarkdown: "\\~~1~\u00a0",
        },
      ],
    },
    {
      id: "live-subscript-empty-source-stays-text",
      title: "Empty and blank source stays plain text",
      initialMarkdown: "|",
      keyevents: ["~", "~", "ArrowLeft", " ", "ArrowRight"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<p>~~|</p>",
          expectedMarkdown: "\\~\\~",
        },
        {
          step: 5,
          expectedProjection: "<p>~ ~|</p>",
          expectedMarkdown: "\\~ \\~",
        },
      ],
    },
    {
      id: "live-subscript-ignores-inline-code",
      title: "Inline code stays literal",
      initialMarkdown: "`~1~`|",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><code>~1|~</code></p>",
          expectedMarkdown: "`~1~`",
        },
      ],
    },
    {
      id: "live-subscript-reveal-pending-at-mark-boundaries",
      title: "Reveal pending markers at mark boundaries",
      initialMarkdown: "|",
      keyevents: ["~", "1", "~", " ", "ArrowLeft", "ArrowLeft"],
      checkpoints: [
        {
          step: 5,
          title: "cursor reaches mark end",
          expectedProjection: "<p><pending>~</pending><sub>1</sub><pending>~</pending>| </p>",
          expectedMarkdown: "~1~\u00a0",
        },
        {
          step: 6,
          title: "cursor moves through closing delimiter",
          expectedProjection: "<p><pending>~</pending><sub>1</sub>|<pending>~</pending> </p>",
          expectedMarkdown: "~1~\u00a0",
        },
      ],
    },
    {
      id: "live-subscript-markdown-round-trip",
      title: "Markdown round trip",
      initialMarkdown: "~1~ a|",
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
      id: "live-subscript-type-at-mark-start",
      title: "Typing at mark start keeps the new source after existing content",
      initialMarkdown: "|~1~",
      keyevents: ["d"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p>1|<pending>~</pending><sub>d</sub><pending>~</pending></p>",
          expectedMarkdown: "1~d~",
        },
      ],
    },
    {
      id: "live-subscript-arrow-left-before-trailing-text",
      title: "Arrow left enters only the trailing text boundary",
      initialMarkdown: "1~d~|d",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p>1<pending>~</pending><sub>d</sub>|<pending>~</pending>d</p>",
          expectedMarkdown: "1~d~d",
        },
      ],
    },
    {
      id: "live-subscript-does-not-cross-lines",
      title: "Does not cross lines",
      initialMarkdown: "|",
      keyevents: ["~", "1", "Enter", "1", "~"],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p>~1</p><p>1~|</p>",
          expectedMarkdown: "\\~1\n\n1\\~",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
