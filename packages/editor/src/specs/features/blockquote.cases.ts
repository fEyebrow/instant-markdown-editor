import type { EditorSpecFeatureDefinition } from "../types.ts";

export const blockquoteSpec = {
  id: "blockquote",
  title: "Blockquote",
  cases: [
    {
      id: "blockquote-trigger",
      title: "'> ' immediately wraps paragraph in a blockquote",
      initialMarkdown: "|",
      keyevents: [">", " "],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<blockquote><p>|</p></blockquote>",
          expectedMarkdown: "> ",
        },
      ],
    },
    {
      id: "blockquote-enter-continues",
      title: "Enter inside a blockquote continues to a new paragraph",
      initialMarkdown: "> a|",
      keyevents: ["Enter", "b"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<blockquote><p>a</p><p>b|</p></blockquote>",
          expectedMarkdown: "> a\n>\n> b",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
