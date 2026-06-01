import type { EditorSpecFeatureDefinition } from "../types.ts";

export const emojiSpec = {
  id: "emoji",
  title: "Emoji Shortcode",
  cases: [
    {
      id: "emoji-source-projection",
      title: "Known shortcode :book: shows source projection",
      initialMarkdown: ":book:",
      keyevents: ["ArrowLeft", "ArrowRight"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<p><emoji-src>:book:</emoji-src></p>|",
          expectedMarkdown: ":book:",
        },
      ],
    },
    {
      id: "emoji-unknown-stays-text",
      title: "Unknown shortcode :not_real: stays as plain text",
      initialMarkdown: ":not_real:",
      keyevents: ["ArrowLeft", "ArrowRight"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<p>:not_real:|</p>",
          expectedMarkdown: ":not_real:",
        },
      ],
    },
    {
      id: "emoji-markdown-round-trip",
      title: "Emoji markdown parses and serializes correctly",
      initialMarkdown: ":book: hello",
      keyevents: ["ArrowLeft", "ArrowRight"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: '<p><emoji shortcode="book"> hello|</p>',
          expectedMarkdown: ":book: hello",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
