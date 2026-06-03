import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveSuperscriptSpec = {
  id: "live-superscript",
  title: "Live Superscript",
  cases: [
    {
      id: "live-superscript-source-projects",
      title: "'^1^' projects as superscript source and serializes as Markdown",
      initialMarkdown: "",
      keyevents: ["^", "1", "^"],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p><pending>^</pending><sup>1</sup><pending>^</pending>|</p>",
          expectedMarkdown: "^1^",
        },
      ],
    },
    {
      id: "live-superscript-empty-source-stays-text",
      title: "Empty and blank source stays plain text",
      initialMarkdown: "",
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
      id: "live-superscript-markdown-round-trip",
      title: "Markdown superscript parses and serializes as superscript",
      initialMarkdown: "^1^ a",
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
      initialMarkdown: "",
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
