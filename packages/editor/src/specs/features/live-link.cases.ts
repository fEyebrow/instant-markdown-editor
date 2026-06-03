import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveLinkSpec = {
  id: "live-link",
  title: "Live Link",
  cases: [
    {
      id: "live-link-source-projects",
      title: "'[x](y)' projects as a link source and serializes as Markdown",
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
      id: "live-link-hides-non-empty-source-on-space",
      title: "Typing Space after a non-empty link hides source and preserves Markdown",
      initialMarkdown: "",
      keyevents: ["[", "x", "]", "(", "y", ")", " "],
      checkpoints: [
        {
          step: 7,
          expectedProjection: '<p><a href="y">x</a> |</p>',
          expectedMarkdown: "[x](y) ",
        },
      ],
    },
    {
      id: "live-link-reveals-rendered-link-source",
      title: "Reveal rendered link source projection",
      initialMarkdown: "[xy](z)",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection:
            '<p><pending>[</pending><a href="z">xy</a><pending>](z</pending>|<pending>)</pending></p>',
          expectedMarkdown: "[xy](z)",
        },
      ],
    },
    {
      id: "live-link-empty-label-stays-source-on-space",
      title: "Empty label stays source projection on Space",
      initialMarkdown: "",
      keyevents: ["[", "]", "(", ")", " "],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p><pending>[</pending><pending>]()</pending> |</p>",
          expectedMarkdown: "[]() ",
        },
      ],
    },
    {
      id: "live-link-incomplete-source-stays-text",
      title: "Incomplete source stays plain text",
      initialMarkdown: "",
      keyevents: ["[", "x", "]", "("],
      checkpoints: [
        {
          step: 4,
          expectedProjection: "<p>[x](|</p>",
          expectedMarkdown: "\\[x\\](",
        },
      ],
    },
    {
      id: "live-link-broken-source-can-be-repaired",
      title: "Broken source can be repaired",
      initialMarkdown: "",
      keyevents: ["[", "x", "]", "(", "y", ")", "Backspace", ")"],
      checkpoints: [
        {
          step: 7,
          title: "broken source is plain text",
          expectedProjection: "<p>[x](y|</p>",
          expectedMarkdown: "\\[x\\](y",
        },
        {
          step: 8,
          title: "repaired source projects again",
          expectedProjection:
            '<p><pending>[</pending><a href="y">x</a><pending>](y)</pending>|</p>',
          expectedMarkdown: "[x](y)",
        },
      ],
    },
    {
      id: "live-link-empty-href-keeps-source",
      title: "Empty href serializes as a link with no href attribute",
      initialMarkdown: "",
      keyevents: ["[", "x", "]", "(", ")", " "],
      checkpoints: [
        {
          step: 6,
          expectedProjection: "<p><a>x</a> |</p>",
          expectedMarkdown: "[x]() ",
        },
      ],
    },
    {
      id: "live-link-complete-empty-forms-project",
      title: "Complete empty forms project",
      initialMarkdown: "",
      keyevents: ["[", "]", "(", "u", ")", " ", "[", "]", "(", ")"],
      checkpoints: [
        {
          step: 5,
          expectedProjection:
            "<p><pending>[</pending><pending>](</pending>u<pending>)</pending>|</p>",
          expectedMarkdown: "[](u)",
        },
        {
          step: 10,
          expectedProjection:
            "<p><pending>[</pending><pending>](</pending>u<pending>)</pending> <pending>[</pending><pending>]()</pending>|</p>",
          expectedMarkdown: "[](u) []()",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
