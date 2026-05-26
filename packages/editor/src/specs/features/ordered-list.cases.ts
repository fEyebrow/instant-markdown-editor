import type { EditorSpecFeatureDefinition } from "../types.ts";

export const orderedListSpec = {
  id: "ordered-list",
  title: "Ordered List",
  cases: [
    {
      id: "ordered-list-trigger",
      title: "'1. ' immediately creates an ordered list",
      initialMarkdown: "|",
      keyevents: ["1", ".", " "],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<ol><li><p>|</p></li></ol>",
          expectedMarkdown: "1. ",
        },
      ],
    },
    {
      id: "ordered-list-enter-sibling",
      title: "Enter on a non-empty item creates a sibling item",
      initialMarkdown: "1. a|",
      keyevents: ["Enter", "b"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ol><li><p>a</p></li><li><p>b|</p></li></ol>",
          expectedMarkdown: "1. a\n2. b",
        },
      ],
    },
    {
      id: "ordered-list-enter-exits-empty-trailing-item",
      title: "Enter on an empty trailing item exits to a paragraph",
      initialMarkdown: "1. a|",
      keyevents: ["Enter", "Enter"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ol><li><p>a</p></li></ol><p>|</p>",
          expectedMarkdown: "1. a",
        },
      ],
    },
    {
      id: "ordered-list-tab-sinks-item",
      title: "Tab sinks an item into a nested ordered list",
      initialMarkdown: "1. a\n2. b|",
      keyevents: ["Tab"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<ol><li><p>a</p><ol><li><p>b|</p></li></ol></li></ol>",
          expectedMarkdown: "1. a\n   1. b",
        },
      ],
    },
    {
      id: "ordered-list-shift-tab-lifts-item",
      title: "Shift-Tab lifts a nested item back to the parent list",
      initialMarkdown: "1. a\n2. b|",
      keyevents: ["Tab", "Shift-Tab"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ol><li><p>a</p></li><li><p>b|</p></li></ol>",
          expectedMarkdown: "1. a\n2. b",
        },
      ],
    },
    {
      id: "ordered-list-markdown-round-trip",
      title: "Markdown ordered lists parse and serialize as lists",
      initialMarkdown: "1. a\n2. b|",
      keyevents: ["ArrowLeft", "ArrowRight"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ol><li><p>a</p></li><li><p>b|</p></li></ol>",
          expectedMarkdown: "1. a\n2. b",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
