import type { EditorSpecFeatureDefinition } from "../types.ts";

export const unorderedListSpec = {
  id: "unordered-list",
  title: "Unordered List",
  cases: [
    {
      id: "unordered-list-dash-trigger",
      title: "'- ' immediately creates an unordered list",
      initialMarkdown: "|",
      keyevents: ["-", " "],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ul><li><p>|</p></li></ul>",
          expectedMarkdown: "* ",
        },
      ],
    },
    {
      id: "unordered-list-star-trigger",
      title: "'* ' immediately creates an unordered list",
      initialMarkdown: "|",
      keyevents: ["*", " "],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ul><li><p>|</p></li></ul>",
          expectedMarkdown: "* ",
        },
      ],
    },
    {
      id: "unordered-list-plus-trigger",
      title: "'+ ' immediately creates an unordered list",
      initialMarkdown: "|",
      keyevents: ["+", " "],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ul><li><p>|</p></li></ul>",
          expectedMarkdown: "* ",
        },
      ],
    },
    {
      id: "unordered-list-enter-sibling",
      title: "Enter on a non-empty item creates a sibling item",
      initialMarkdown: "- a|",
      keyevents: ["Enter", "b"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ul><li><p>a</p></li><li><p>b|</p></li></ul>",
          expectedMarkdown: "* a\n* b",
        },
      ],
    },
    {
      id: "unordered-list-enter-exits-empty-trailing-item",
      title: "Enter on an empty trailing item exits to a paragraph",
      initialMarkdown: "- a|",
      keyevents: ["Enter", "Enter"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ul><li><p>a</p></li></ul><p>|</p>",
          expectedMarkdown: "* a",
        },
      ],
    },
    {
      id: "unordered-list-tab-sinks-item",
      title: "Tab sinks an item into a nested unordered list",
      initialMarkdown: "- a\n- b|",
      keyevents: ["Tab"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<ul><li><p>a</p><ul><li><p>b|</p></li></ul></li></ul>",
          expectedMarkdown: "* a\n  * b",
        },
      ],
    },
    {
      id: "unordered-list-shift-tab-lifts-item",
      title: "Shift-Tab lifts a nested item back to the parent list",
      initialMarkdown: "- a\n- b|",
      keyevents: ["Tab", "Shift-Tab"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ul><li><p>a</p></li><li><p>b|</p></li></ul>",
          expectedMarkdown: "* a\n* b",
        },
      ],
    },
    {
      id: "unordered-list-markdown-round-trip",
      title: "Markdown unordered lists parse and serialize as lists",
      initialMarkdown: "- a\n- b|",
      keyevents: ["ArrowLeft", "ArrowRight"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<ul><li><p>a</p></li><li><p>b|</p></li></ul>",
          expectedMarkdown: "* a\n* b",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
