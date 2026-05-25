export interface EditorSpecCheckpoint {
  step: number;
  title: string;
  expectedProjection: string;
  expectedMarkdown: string;
}

export interface EditorSpecCase {
  id: string;
  title: string;
  initialMarkdown?: string;
  keyevents: string[];
  checkpoints: EditorSpecCheckpoint[];
}

export interface EditorSpecFeature {
  id: string;
  title: string;
  cases: EditorSpecCase[];
}

type EditorSpecCheckpointDefinition = { step: number } & Partial<
  Omit<EditorSpecCheckpoint, "step">
>;

interface EditorSpecCaseDefinition {
  id: string;
  title: string;
  initialMarkdown?: string;
  keyevents: string[];
  checkpoints: EditorSpecCheckpointDefinition[];
}

interface EditorSpecFeatureDefinition {
  id: string;
  title: string;
  cases: EditorSpecCaseDefinition[];
}

const EDITOR_SPEC_FEATURE_DEFINITIONS: EditorSpecFeatureDefinition[] = [
  {
    id: "live-italic",
    title: "Live Italic",
    cases: [
      {
        id: "live-italic-basic",
        title: "Basic commit flow",
        initialMarkdown: "|",
        keyevents: ["*", "1", "*", " "],
        checkpoints: [
          {
            step: 3,
            expectedProjection: "<p><pending>*</pending><i>1</i><pending>*</pending>|</p>",
            expectedMarkdown: "*1*",
          },
          {
            step: 4,
            expectedProjection: "<p><i>1</i> |</p>",
            expectedMarkdown: "*1*\u00a0",
          },
        ],
      },
      {
        id: "live-italic-reopen-pending-before-space",
        title: "Reopen pending markers before trailing space",
        initialMarkdown: "\\*1\\*|",
        keyevents: [" ", "Backspace"],
        checkpoints: [
          {
            step: 2,
            expectedProjection: "<p><pending>*</pending><i>1</i><pending>*</pending>|</p>",
            expectedMarkdown: "*1*",
          },
        ],
      },
      {
        id: "live-italic-reveal-pending-at-mark-boundaries",
        title: "Reveal pending markers at mark boundaries",
        initialMarkdown: "|",
        keyevents: ["*", "1", "*", " ", "ArrowLeft", "ArrowLeft"],
        checkpoints: [
          {
            step: 5,
            title: "cursor reaches mark end",
            expectedProjection: "<p><pending>*</pending><i>1</i><pending>*</pending>| </p>",
            expectedMarkdown: "*1*\u00a0",
          },
          {
            step: 6,
            title: "cursor reaches mark start",
            expectedProjection: "<p>|<pending>*</pending><i>1</i><pending>*</pending> </p>",
            expectedMarkdown: "*1*\u00a0",
          },
        ],
      },
    ],
  },
  {
    id: "live-strong",
    title: "Live Strong",
    cases: [
      {
        id: "live-strong-basic",
        title: "Basic commit flow",
        initialMarkdown: "|",
        keyevents: ["*", "*", "1", "*", "*", " "],
        checkpoints: [
          {
            step: 5,
            expectedProjection: "<p><pending>**</pending><b>1</b><pending>**</pending>|</p>",
            expectedMarkdown: "**1**",
          },
          {
            step: 6,
            expectedProjection: "<p><b>1</b> |</p>",
            expectedMarkdown: "**1**\u00a0",
          },
        ],
      },
    ],
  },
  {
    id: "live-strikethrough",
    title: "Live Strikethrough",
    cases: [
      {
        id: "live-strikethrough-basic",
        title: "Basic commit flow",
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
        id: "live-strikethrough-reopen-pending-before-space",
        title: "Reopen pending markers before trailing space",
        initialMarkdown: "\\~\\~1\\~\\~|",
        keyevents: [" ", "Backspace"],
        checkpoints: [
          {
            step: 2,
            expectedProjection: "<p><pending>~~</pending><s>1</s><pending>~~</pending>|</p>",
            expectedMarkdown: "~~1~~",
          },
        ],
      },
      {
        id: "live-strikethrough-reveal-pending-at-mark-boundaries",
        title: "Reveal pending markers at mark boundaries",
        initialMarkdown: "|",
        keyevents: ["~", "~", "1", "~", "~", " ", "ArrowLeft", "ArrowLeft"],
        checkpoints: [
          {
            step: 7,
            title: "cursor reaches mark end",
            expectedProjection: "<p><pending>~~</pending><s>1</s><pending>~~</pending>| </p>",
            expectedMarkdown: "~~1~~\u00a0",
          },
          {
            step: 8,
            title: "cursor reaches mark start",
            expectedProjection: "<p>|<pending>~~</pending><s>1</s><pending>~~</pending> </p>",
            expectedMarkdown: "~~1~~\u00a0",
          },
        ],
      },
    ],
  },
  {
    id: "thematic-break",
    title: "Thematic Break",
    cases: [
      {
        id: "thematic-break-enter-commit",
        title: "Enter on '---' creates hr",
        initialMarkdown: "|",
        keyevents: ["-", "-", "-", "Enter"],
        checkpoints: [
          {
            step: 4,
            expectedProjection: "<hr><p>|</p>",
            expectedMarkdown: "---",
          },
        ],
      },
      {
        id: "thematic-break-four-dashes",
        title: "'----' also commits to hr on Enter",
        initialMarkdown: "|",
        keyevents: ["-", "-", "-", "-", "Enter"],
        checkpoints: [
          {
            step: 5,
            expectedProjection: "<hr><p>|</p>",
            expectedMarkdown: "---",
          },
        ],
      },
      {
        id: "thematic-break-two-dashes",
        title: "'--' stays as plain text on Enter",
        initialMarkdown: "|",
        keyevents: ["-", "-", "Enter"],
        checkpoints: [
          {
            step: 3,
            expectedProjection: "<p>--</p><p>|</p>",
            expectedMarkdown: "\\--",
          },
        ],
      },
      {
        id: "thematic-break-arrow-down-commit",
        title: "ArrowDown leaving '---' line commits to hr",
        initialMarkdown: "\\---|\n\nx",
        keyevents: ["ArrowDown"],
        checkpoints: [
          {
            step: 1,
            expectedProjection: "<hr><p>|x</p>",
            expectedMarkdown: "---\n\nx",
          },
        ],
      },
    ],
  },
  {
    id: "live-code",
    title: "Live Code",
    cases: [
      {
        id: "live-code-basic",
        title: "Basic commit flow",
        initialMarkdown: "|",
        keyevents: ["`", "1", "`", " "],
        checkpoints: [
          {
            step: 3,
            expectedProjection: "<p><pending>`</pending><code>1</code><pending>`</pending>|</p>",
            expectedMarkdown: "`1`",
          },
          {
            step: 4,
            expectedProjection: "<p><code>1</code> |</p>",
            expectedMarkdown: "`1`\u00a0",
          },
        ],
      },
    ],
  },
  {
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
  },
  {
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
  },
  {
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
  },
];

export const EDITOR_SPEC_FEATURES: EditorSpecFeature[] = defineEditorSpecFeatures(
  EDITOR_SPEC_FEATURE_DEFINITIONS,
);

function defineEditorSpecFeatures(features: EditorSpecFeatureDefinition[]): EditorSpecFeature[] {
  return features.map((feature) => ({
    id: feature.id,
    title: feature.title,
    cases: feature.cases.map((specCase) => {
      return {
        id: specCase.id,
        title: specCase.title,
        initialMarkdown: specCase.initialMarkdown,
        keyevents: specCase.keyevents,
        checkpoints: specCase.checkpoints.map(resolveCheckpoint),
      };
    }),
  }));
}

function resolveCheckpoint(checkpoint: EditorSpecCheckpointDefinition): EditorSpecCheckpoint {
  return {
    step: checkpoint.step,
    title: checkpoint.title ?? `step ${checkpoint.step}`,
    expectedProjection: checkpoint.expectedProjection ?? "",
    expectedMarkdown: checkpoint.expectedMarkdown ?? "",
  };
}
