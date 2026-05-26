import type { EditorSpecFeatureDefinition } from "../types.ts";

export const atxHeadingSpec = {
  id: "atx-heading",
  title: "ATX Heading",
  cases: [
    {
      id: "atx-heading-pending-on-content",
      title: "'# d' shows block pending marker on the leading '#' and previews content as strong",
      initialMarkdown: "|",
      keyevents: ["#", " ", "d"],
      checkpoints: [
        {
          step: 3,
          expectedProjection: "<p><block-pending>#</block-pending> <strong>d</strong>|</p>",
          expectedMarkdown: "\\# d",
        },
      ],
    },
    {
      id: "atx-heading-enter-commit-h1",
      title: "Enter on '# d' commits to <h1>",
      initialMarkdown: "|",
      keyevents: ["#", " ", "d", "Enter"],
      checkpoints: [
        {
          step: 4,
          expectedProjection: "<h1>d</h1><p>|</p>",
          expectedMarkdown: "# d",
        },
      ],
    },
    {
      id: "atx-heading-arrow-down-commit",
      title: "ArrowDown leaving '# d' line commits to <h1>",
      initialMarkdown: "\\# d|\n\nx",
      keyevents: ["ArrowDown"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<h1>d</h1><p>|x</p>",
          expectedMarkdown: "# d\n\nx",
        },
      ],
    },
    {
      id: "atx-heading-h3-enter-commit",
      title: "Enter on '### d' commits to <h3>",
      initialMarkdown: "|",
      keyevents: ["#", "#", "#", " ", "d", "Enter"],
      checkpoints: [
        {
          step: 6,
          expectedProjection: "<h3>d</h3><p>|</p>",
          expectedMarkdown: "### d",
        },
      ],
    },
    {
      id: "atx-heading-h6-enter-commit",
      title: "Enter on '###### d' commits to <h6>",
      initialMarkdown: "|",
      keyevents: ["#", "#", "#", "#", "#", "#", " ", "d", "Enter"],
      checkpoints: [
        {
          step: 9,
          expectedProjection: "<h6>d</h6><p>|</p>",
          expectedMarkdown: "###### d",
        },
      ],
    },
    {
      id: "atx-heading-seven-hashes-no-trigger",
      title: "'####### d' (7 hashes) stays a paragraph on Enter",
      initialMarkdown: "|",
      keyevents: ["#", "#", "#", "#", "#", "#", "#", " ", "d", "Enter"],
      checkpoints: [
        {
          step: 10,
          expectedProjection: "<p>####### d</p><p>|</p>",
          expectedMarkdown: "####### d",
        },
      ],
    },
    {
      id: "atx-heading-trigger-inside-list-item",
      title: "'# d' inside a list item shows pending and commits to heading in place",
      initialMarkdown: "- |",
      keyevents: ["#", " ", "d", "Enter"],
      checkpoints: [
        {
          step: 3,
          title: "pending visible inside list item",
          expectedProjection:
            "<ul><li><p><block-pending>#</block-pending> <strong>d</strong>|</p></li></ul>",
          expectedMarkdown: "* \\# d",
        },
        {
          step: 4,
          title: "Enter commits heading in place inside list item",
          expectedProjection: "<ul><li><h1>d</h1><p>|</p></li></ul>",
          expectedMarkdown: "* # d",
        },
      ],
    },
    {
      id: "atx-heading-trigger-inside-blockquote",
      title: "'# d' inside a blockquote shows pending and commits to heading in place",
      initialMarkdown: "> |",
      keyevents: ["#", " ", "d", "Enter"],
      checkpoints: [
        {
          step: 3,
          title: "pending visible inside blockquote",
          expectedProjection:
            "<blockquote><p><block-pending>#</block-pending> <strong>d</strong>|</p></blockquote>",
          expectedMarkdown: "> \\# d",
        },
        {
          step: 4,
          title: "Enter commits heading in place inside blockquote",
          expectedProjection: "<blockquote><h1>d</h1><p>|</p></blockquote>",
          expectedMarkdown: "> # d",
        },
      ],
    },
    {
      id: "atx-heading-reentering-committed-no-pending",
      title: "Cursor re-entering a committed heading shows no pending",
      initialMarkdown: "# d\n\n|x",
      keyevents: ["ArrowUp"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<h1>d|</h1><p>x</p>",
          expectedMarkdown: "# d\n\nx",
        },
      ],
    },
    {
      id: "atx-heading-typing-does-not-auto-commit",
      title: "Typing more characters keeps pending; only Enter commits",
      initialMarkdown: "|",
      keyevents: ["#", " ", "d", "d", "Enter"],
      checkpoints: [
        {
          step: 4,
          title: "pending persists after typing more content",
          expectedProjection: "<p><block-pending>#</block-pending> <strong>dd</strong>|</p>",
          expectedMarkdown: "\\# dd",
        },
        {
          step: 5,
          title: "Enter commits to h1",
          expectedProjection: "<h1>dd</h1><p>|</p>",
          expectedMarkdown: "# dd",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
