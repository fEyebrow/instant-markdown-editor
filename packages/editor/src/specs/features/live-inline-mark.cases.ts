import type { EditorSpecFeatureDefinition } from "../types.ts";

// Inline normalize 模块的行为测试床。挑选 highlight (==) 作为示例 mark；
// 这里验证 source text 作为唯一真相时的 mark 同步、嵌套/交叉取舍和 delimiter 装饰。
export const liveInlineMarkSpec = {
  id: "live-inline-mark",
  title: "Live Inline Mark Module",
  cases: [
    {
      id: "live-inline-mark-nests-strong-and-em",
      title: "Nested strong and em remain stable from source text",
      initialMarkdown: "",
      keyevents: [
        "*",
        "*",
        "b",
        "o",
        "l",
        "d",
        " ",
        "*",
        "e",
        "m",
        "*",
        "*",
        "*",
        "ArrowLeft",
        "ArrowLeft",
      ],
      checkpoints: [
        {
          step: 15,
          title: "outer strong and inner em both project from retained delimiters",
          expectedProjection:
            "<p><pending>**</pending><b>bold <pending>*</pending></b><i><b>em</b></i><b><pending>*</pending></b>|<pending>**</pending></p>",
          expectedMarkdown: "**bold *em***",
        },
      ],
    },

    {
      id: "live-inline-mark-inline-code-isolates-strong-source",
      title: "Inline code isolates strong source",
      initialMarkdown: "`**x**`",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          title: "asterisk delimiter characters stay literal inside code",
          expectedProjection: "<p><pending>`</pending><code>**x**</code>|<pending>`</pending></p>",
          expectedMarkdown: "`**x**`",
        },
      ],
    },

    {
      id: "live-inline-mark-rejects-crossing-lower-priority-source",
      title: "Crossing lower-priority source is ignored",
      initialMarkdown: "==*x==*",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          title: "highlight wins and crossing em stays literal",
          expectedProjection: "<p><pending>==</pending><mark>*x</mark><pending>==</pending>|*</p>",
          expectedMarkdown: "==*x==*",
        },
      ],
    },

    // PlainText → SourceProjection
    {
      id: "live-inline-mark-plain-text-to-source-projection",
      title: "Complete source enters source projection",
      initialMarkdown: "",
      keyevents: ["=", "=", "1", "=", "="],
      checkpoints: [
        {
          step: 5,
          title: "delimiters render as pending, content carries highlight mark",
          expectedProjection: "<p><pending>==</pending><mark>1</mark><pending>==</pending>|</p>",
          expectedMarkdown: "==1==",
        },
      ],
    },

    // SourceProjection → Committed via trailing space
    {
      id: "live-inline-mark-commit-on-trailing-space",
      title: "Trailing space commits source projection",
      initialMarkdown: "",
      keyevents: ["=", "=", "1", "=", "=", " ", "x"],
      checkpoints: [
        {
          step: 6,
          title: "delimiters hide while source text remains",
          expectedProjection: "<p><mark>1</mark> |</p>",
          expectedMarkdown: "==1== ",
        },
        {
          step: 7,
          title: "continued typing extends plain text after committed mark",
          expectedProjection: "<p><mark>1</mark> x|</p>",
          expectedMarkdown: "==1== x",
        },
      ],
    },

    // SourceProjection → Committed via trailing plain text
    {
      id: "live-inline-mark-commit-on-trailing-text",
      title: "Trailing plain character commits source projection",
      initialMarkdown: "",
      keyevents: ["=", "=", "1", "=", "=", "x"],
      checkpoints: [
        {
          step: 6,
          title: "delimiters hide, x stays plain text after source mark",
          expectedProjection: "<p><mark>1</mark>x|</p>",
          expectedMarkdown: "==1==x",
        },
      ],
    },

    // Empty content is not a valid source
    {
      id: "live-inline-mark-empty-source-stays-plain-text",
      title: "Empty source does not enter source projection",
      initialMarkdown: "",
      keyevents: ["=", "=", "=", "="],
      checkpoints: [
        {
          step: 4,
          title: "all characters stay as plain text",
          expectedProjection: "<p>====|</p>",
          expectedMarkdown: "====",
        },
      ],
    },

    // Inline code isolation
    {
      id: "live-inline-mark-inline-code-isolates-source",
      title: "Source inside inline code is not recognized",
      initialMarkdown: "`==1==`",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          title: "delimiter characters stay literal inside code",
          expectedProjection: "<p><pending>`</pending><code>==1==</code>|<pending>`</pending></p>",
          expectedMarkdown: "`==1==`",
        },
      ],
    },

    // Committed → SourceProjection (re-enter at right boundary)
    {
      id: "live-inline-mark-reenter-at-right-boundary",
      title: "Selection at committed mark right boundary triggers re-enter",
      initialMarkdown: "==1== a",
      keyevents: ["ArrowLeft", "ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          title: "cursor between trailing space and a, mark stays committed",
          expectedProjection: "<p><mark>1</mark> |a</p>",
          expectedMarkdown: "==1== a",
        },
        {
          step: 2,
          title: "cursor reaches mark right boundary, delimiters reappear as real text",
          expectedProjection: "<p><pending>==</pending><mark>1</mark><pending>==</pending>| a</p>",
          expectedMarkdown: "==1== a",
        },
      ],
    },

    // SourceProjection → PlainText (delimiter broken)
    {
      id: "live-inline-mark-invalidates-on-delimiter-break",
      title: "Breaking close delimiter invalidates source projection",
      initialMarkdown: "",
      keyevents: ["=", "=", "1", "=", "=", "Backspace"],
      checkpoints: [
        {
          step: 5,
          title: "complete source projection",
          expectedProjection: "<p><pending>==</pending><mark>1</mark><pending>==</pending>|</p>",
          expectedMarkdown: "==1==",
        },
        {
          step: 6,
          title: "removing one closing delimiter character drops the mark in same transaction",
          expectedProjection: "<p>==1=|</p>",
          expectedMarkdown: "==1=",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
