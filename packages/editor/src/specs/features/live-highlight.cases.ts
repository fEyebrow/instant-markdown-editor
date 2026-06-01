import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveHighlightSpec = {
  id: "live-highlight",
  title: "Live Highlight",
  cases: [
    {
      id: "live-highlight-basic",
      title: "Basic commit flow",
      initialMarkdown: "",
      keyevents: ["=", "=", "1", "=", "=", " "],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>==</pending><mark>1</mark><pending>==</pending>|</p>",
          expectedMarkdown: "==1==",
        },
        {
          step: 6,
          expectedProjection: "<p><mark>1</mark> |</p>",
          expectedMarkdown: "==1==\u00a0",
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
      id: "live-highlight-ignores-inline-code",
      title: "Inline code stays literal",
      initialMarkdown: "`==1==`",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><code>==1=|=</code></p>",
          expectedMarkdown: "`==1==`",
        },
      ],
    },
    {
      id: "live-highlight-reveal-pending-at-mark-boundaries",
      title: "Reveal pending markers at mark boundaries",
      initialMarkdown: "",
      keyevents: ["=", "=", "1", "=", "=", " ", "ArrowLeft", "ArrowLeft"],
      checkpoints: [
        {
          step: 7,
          title: "cursor reaches mark end",
          expectedProjection: "<p><pending>==</pending><mark>1</mark><pending>==</pending>| </p>",
          expectedMarkdown: "==1==\u00a0",
        },
        {
          step: 8,
          title: "cursor moves through closing delimiter",
          expectedProjection:
            "<p><pending>==</pending><mark>1</mark><pending>=</pending>|<pending>=</pending> </p>",
          expectedMarkdown: "==1==\u00a0",
        },
      ],
    },
    {
      id: "live-highlight-markdown-round-trip",
      title: "Markdown round trip",
      initialMarkdown: "==1== a",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><mark>1</mark> |a</p>",
          expectedMarkdown: "==1== a",
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
