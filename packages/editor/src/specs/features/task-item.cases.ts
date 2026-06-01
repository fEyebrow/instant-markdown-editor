import type { EditorSpecFeatureDefinition } from "../types.ts";

export const taskItemSpec = {
  id: "task-item",
  title: "Task Item",
  cases: [
    {
      id: "task-item-unchecked-trigger",
      title: "[ ]  at list item start creates unchecked task item",
      initialMarkdown: "- ",
      keyevents: ["[", " ", "]", " "],
      checkpoints: [
        {
          step: 4,
          expectedProjection: '<ul><task-item checked="false"><p>|</p></task-item></ul>',
          expectedMarkdown: "* [ ] ",
        },
      ],
    },
    {
      id: "task-item-checked-trigger",
      title: "[x]  at list item start creates checked task item",
      initialMarkdown: "- ",
      keyevents: ["[", "x", "]", " "],
      checkpoints: [
        {
          step: 4,
          expectedProjection: '<ul><task-item checked="true"><p>|</p></task-item></ul>',
          expectedMarkdown: "* [x] ",
        },
      ],
    },
    {
      id: "task-item-checked-uppercase-trigger",
      title: "[X]  at list item start creates checked task item (normalized to [x])",
      initialMarkdown: "- ",
      keyevents: ["[", "X", "]", " "],
      checkpoints: [
        {
          step: 4,
          expectedProjection: '<ul><task-item checked="true"><p>|</p></task-item></ul>',
          expectedMarkdown: "* [x] ",
        },
      ],
    },
    {
      id: "task-item-enter-creates-sibling-unchecked",
      title: "Enter on non-empty task item creates sibling unchecked task item",
      initialMarkdown: "- [ ] todo",
      keyevents: ["Enter", "a"],
      checkpoints: [
        {
          step: 2,
          expectedProjection:
            '<ul><task-item checked="false"><p>todo</p></task-item><task-item checked="false"><p>a|</p></task-item></ul>',
          expectedMarkdown: "* [ ] todo\n* [ ] a",
        },
      ],
    },
    {
      id: "task-item-enter-on-empty-exits-list",
      title: "Enter on empty task item exits to paragraph",
      initialMarkdown: "- [ ] todo",
      keyevents: ["Enter", "Enter"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: '<ul><task-item checked="false"><p>todo</p></task-item></ul><p>|</p>',
          expectedMarkdown: "* [ ] todo",
        },
      ],
    },
    {
      id: "task-item-enter-checked-creates-unchecked",
      title: "Enter on checked task item creates unchecked sibling",
      initialMarkdown: "- [x] done",
      keyevents: ["Enter", "a"],
      checkpoints: [
        {
          step: 2,
          expectedProjection:
            '<ul><task-item checked="true"><p>done</p></task-item><task-item checked="false"><p>a|</p></task-item></ul>',
          expectedMarkdown: "* [x] done\n* [ ] a",
        },
      ],
    },
    {
      id: "task-item-tab-sinks",
      title: "Tab sinks task item into nested list",
      initialMarkdown: "- [ ] a\n- [ ] b",
      keyevents: ["Tab"],
      checkpoints: [
        {
          step: 1,
          expectedProjection:
            '<ul><task-item checked="false"><p>a</p><ul><task-item checked="false"><p>b|</p></task-item></ul></task-item></ul>',
          expectedMarkdown: "* [ ] a\n  * [ ] b",
        },
      ],
    },
    {
      id: "task-item-shift-tab-lifts",
      title: "Shift-Tab lifts nested task item back to parent list",
      initialMarkdown: "- [ ] a\n- [ ] b",
      keyevents: ["Tab", "Shift-Tab"],
      checkpoints: [
        {
          step: 2,
          expectedProjection:
            '<ul><task-item checked="false"><p>a</p></task-item><task-item checked="false"><p>b|</p></task-item></ul>',
          expectedMarkdown: "* [ ] a\n* [ ] b",
        },
      ],
    },
    {
      id: "task-item-checked-state-follows-tab",
      title: "Checked state follows task item through Tab",
      initialMarkdown: "- [ ] a\n- [x] done",
      keyevents: ["Tab"],
      checkpoints: [
        {
          step: 1,
          expectedProjection:
            '<ul><task-item checked="false"><p>a</p><ul><task-item checked="true"><p>done|</p></task-item></ul></task-item></ul>',
          expectedMarkdown: "* [ ] a\n  * [x] done",
        },
      ],
    },
    {
      id: "task-item-markdown-round-trip",
      title: "task list markdown parses and serializes correctly",
      initialMarkdown: "- [ ] todo\n- [x] done",
      keyevents: ["ArrowLeft", "ArrowRight"],
      checkpoints: [
        {
          step: 2,
          expectedProjection:
            '<ul><task-item checked="false"><p>todo</p></task-item><task-item checked="true"><p>done|</p></task-item></ul>',
          expectedMarkdown: "* [ ] todo\n* [x] done",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
