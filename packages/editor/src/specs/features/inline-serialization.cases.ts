import type { EditorSpecFeatureDefinition } from "../types.ts";

export const inlineSerializationSpec = {
  id: "inline-serialization",
  title: "Inline Serialization",
  cases: [
    {
      id: "inline-serialization-keeps-strong-source",
      title: "Strong source serializes from retained text",
      initialMarkdown: "",
      keyevents: ["*", "*", "1", "*", "*"],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>**</pending><b>1</b><pending>**</pending>|</p>",
          expectedMarkdown: "**1**",
        },
      ],
    },
    {
      id: "inline-serialization-keeps-link-source",
      title: "Link source serializes from retained text",
      initialMarkdown: "",
      keyevents: ["[", "x", "]", "(", "y", ")"],
      checkpoints: [
        {
          step: 6,
          expectedProjection:
            '<p><pending>[</pending><a href="y">x</a><pending>](y)</pending>|</p>',
          expectedMarkdown: "[x](y)",
        },
      ],
    },
    {
      id: "inline-serialization-keeps-code-source",
      title: "Inline code source serializes from retained text",
      initialMarkdown: "",
      keyevents: ["`", "a", "*", "b", "`"],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>`</pending><code>a*b</code><pending>`</pending>|</p>",
          expectedMarkdown: "`a*b`",
        },
      ],
    },
    {
      id: "inline-serialization-keeps-highlight-subscript-superscript-source",
      title: "Custom inline mark sources serialize from retained text",
      initialMarkdown: "",
      keyevents: ["=", "=", "1", "=", "=", " ", "~", "1", "~", " ", "^", "1", "^"],
      checkpoints: [
        {
          step: 13,
          expectedProjection:
            "<p><mark>1</mark> <sub>1</sub> <pending>^</pending><sup>1</sup><pending>^</pending>|</p>",
          expectedMarkdown: "==1== ~1~ ^1^",
        },
      ],
    },
    {
      id: "inline-serialization-keeps-plain-emphasis-looking-source",
      title: "Plain emphasis-looking source serializes without escaping",
      initialMarkdown: "",
      keyevents: ["h", "e", "l", "l", "o", " ", "*", "w", "o", "r", "l", "d"],
      checkpoints: [
        {
          step: 12,
          expectedProjection: "<p>hello *world|</p>",
          expectedMarkdown: "hello *world",
        },
      ],
    },
    {
      id: "inline-serialization-keeps-invalid-strong-source",
      title: "Invalid strong-looking source serializes without rewriting or escaping",
      initialMarkdown: "",
      keyevents: ["*", "*", " ", "h", "e", "l", "l", "o", " ", "*", "*"],
      checkpoints: [
        {
          step: 11,
          expectedProjection: "<p>** hello **|</p>",
          expectedMarkdown: "** hello **",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
