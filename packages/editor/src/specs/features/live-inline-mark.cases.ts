import type { EditorSpecFeatureDefinition } from "../types.ts";

// Live inline mark 模块的单层行为测试床。挑选 highlight (==) 作为示例 mark；
// 这里只验证模块统一管线：Resolver 状态转换、Controller 单步转换、Decorations 真字符装饰。
// 嵌套行为不在本文件范围内。
export const liveInlineMarkSpec = {
  id: "live-inline-mark",
  title: "Live Inline Mark Module",
  cases: [
    // PlainText → SourceProjection
    {
      id: "live-inline-mark-plain-text-to-source-projection",
      title: "Complete source enters source projection",
      initialMarkdown: "|",
      keyevents: ["=", "=", "1", "=", "="],
      checkpoints: [
        {
          step: 5,
          title: "delimiters render as pending, content carries highlight mark",
          expectedProjection: "<p><pending>==</pending><mark>1</mark><pending>==|</pending></p>",
          expectedMarkdown: "==1==",
        },
      ],
    },

    // SourceProjection → Committed via trailing space
    {
      id: "live-inline-mark-commit-on-trailing-space",
      title: "Trailing space commits source projection",
      initialMarkdown: "|",
      keyevents: ["=", "=", "1", "=", "=", " ", "x"],
      checkpoints: [
        {
          step: 6,
          title: "delimiters removed, boundary space normalized to NBSP",
          expectedProjection: "<p><mark>1</mark> |</p>",
          expectedMarkdown: "==1==\u00a0",
        },
        {
          step: 7,
          title: "continued typing extends plain text after committed mark",
          expectedProjection: "<p><mark>1</mark> x|</p>",
          expectedMarkdown: "==1==\u00a0x",
        },
      ],
    },

    // SourceProjection → Committed via trailing plain text
    {
      id: "live-inline-mark-commit-on-trailing-text",
      title: "Trailing plain character commits source projection",
      initialMarkdown: "|",
      keyevents: ["=", "=", "1", "=", "=", "x"],
      checkpoints: [
        {
          step: 6,
          title: "delimiters removed, x stays plain text after committed mark",
          expectedProjection: "<p><mark>1</mark>x|</p>",
          expectedMarkdown: "==1==x",
        },
      ],
    },

    // Empty content is not a valid source
    {
      id: "live-inline-mark-empty-source-stays-plain-text",
      title: "Empty source does not enter source projection",
      initialMarkdown: "|",
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
      initialMarkdown: "`==1==`|",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          title: "delimiter characters stay literal inside code",
          expectedProjection: "<p><code>==1=|=</code></p>",
          expectedMarkdown: "`==1==`",
        },
      ],
    },

    // Committed → SourceProjection (re-enter at right boundary)
    {
      id: "live-inline-mark-reenter-at-right-boundary",
      title: "Selection at committed mark right boundary triggers re-enter",
      initialMarkdown: "==1== a|",
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
      initialMarkdown: "|",
      keyevents: ["=", "=", "1", "=", "=", "Backspace"],
      checkpoints: [
        {
          step: 5,
          title: "complete source projection",
          expectedProjection: "<p><pending>==</pending><mark>1</mark><pending>==|</pending></p>",
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
