import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveSuperscriptSpec = {
  id: "live-superscript",
  title: "Live Superscript",
  cases: [
    {
      id: "live-superscript-basic",
      title: "Basic commit flow",
      initialMarkdown: "|",
      keyevents: ["^", "1", "^", " "],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p><pending>^</pending><sup>1</sup><pending>^|</pending></p>",
          expectedMarkdown: "^1^",
        },
        {
          step: 4,
          expectedProjection: "<p><sup>1</sup> |</p>",
          expectedMarkdown: "^1^\u00a0",
        },
      ],
    },
    {
      id: "live-superscript-empty-source-stays-text",
      title: "Empty and blank source stays plain text",
      initialMarkdown: "|",
      keyevents: ["^", "^", "ArrowLeft", " ", "ArrowRight"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<p>^^|</p>",
          expectedMarkdown: "^^",
        },
        {
          step: 5,
          expectedProjection: "<p>^ ^|</p>",
          expectedMarkdown: "^ ^",
        },
      ],
    },
    {
      id: "live-superscript-ignores-inline-code",
      title: "Inline code stays literal",
      initialMarkdown: "`^1^`|",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><code>^1|^</code></p>",
          expectedMarkdown: "`^1^`",
        },
      ],
    },
    {
      id: "live-superscript-reveal-pending-at-mark-boundaries",
      title: "Reveal pending markers at mark boundaries",
      initialMarkdown: "|",
      keyevents: ["^", "1", "^", " ", "ArrowLeft", "ArrowLeft"],
      checkpoints: [
        {
          step: 5,
          title: "cursor reaches mark end",
          expectedProjection: "<p><pending>^</pending><sup>1</sup><pending>^</pending>| </p>",
          expectedMarkdown: "^1^\u00a0",
        },
        {
          step: 6,
          title: "cursor moves through closing delimiter",
          expectedProjection: "<p><pending>^</pending><sup>1</sup><pending>|^</pending> </p>",
          expectedMarkdown: "^1^\u00a0",
        },
      ],
    },
    {
      id: "live-superscript-markdown-round-trip",
      title: "Markdown round trip",
      initialMarkdown: "^1^ a|",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><sup>1</sup> |a</p>",
          expectedMarkdown: "^1^ a",
        },
      ],
    },
    {
      id: "live-superscript-does-not-cross-lines",
      title: "Does not cross lines",
      initialMarkdown: "|",
      keyevents: ["^", "1", "Enter", "1", "^"],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p>^1</p><p>1^|</p>",
          expectedMarkdown: "^1\n\n1^",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
