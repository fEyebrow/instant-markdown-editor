import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveLinkSpec = {
  id: "live-link",
  title: "Live Link",
  cases: [
    {
      id: "live-link-basic-source-projection",
      title: "Basic source projection",
      initialMarkdown: "",
      keyevents: ["[", "x", "]", "(", "y", ")"],
      checkpoints: [
        {
          step: 6,
          expectedProjection:
            "<p><pending>[</pending><link-label>x</link-label><pending>](</pending><link-url>y</link-url><pending>)</pending>|</p>",
          expectedMarkdown: "[x](y)",
        },
      ],
    },
    {
      id: "live-link-commits-non-empty-label-on-space",
      title: "Commit non-empty label on Space",
      initialMarkdown: "",
      keyevents: ["[", "x", "]", "(", "y", ")", "Space"],
      checkpoints: [
        {
          step: 7,
          expectedProjection: '<p><a href="y">x</a> |</p>',
          expectedMarkdown: "[x](y)\u00a0",
        },
      ],
    },
    {
      id: "live-link-commits-non-empty-label-on-cursor-leave",
      title: "Commit non-empty label when cursor leaves",
      initialMarkdown: "",
      keyevents: ["[", "x", "]", "(", "y", ")", "ArrowLeft", "ArrowRight"],
      checkpoints: [
        {
          step: 8,
          expectedProjection: '<p><a href="y">x</a>|</p>',
          expectedMarkdown: "[x](y)",
        },
      ],
    },
    {
      id: "live-link-reenters-rendered-link-as-source-projection",
      title: "Re-enter rendered link as source projection",
      initialMarkdown: "[xy](z)",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection:
            "<p><pending>[</pending><link-label>x</link-label>|<link-label>y</link-label><pending>](</pending><link-url>z</link-url><pending>)</pending></p>",
          expectedMarkdown: "[xy](z)",
        },
      ],
    },
    {
      id: "live-link-empty-label-stays-source-on-space",
      title: "Empty label stays source projection on Space",
      initialMarkdown: "",
      keyevents: ["[", "]", "(", ")", "Space"],
      checkpoints: [
        {
          step: 5,
          expectedProjection:
            "<p><pending>[</pending><pending>](</pending><pending>)</pending>|</p>",
          expectedMarkdown: "[]()",
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
            "<p><pending>[</pending><link-label>x</link-label><pending>](</pending><link-url>y</link-url><pending>)</pending>|</p>",
          expectedMarkdown: "[x](y)",
        },
      ],
    },
    {
      id: "live-link-empty-href-commits",
      title: "Empty href commits",
      initialMarkdown: "",
      keyevents: ["[", "x", "]", "(", ")", "Space"],
      checkpoints: [
        {
          step: 6,
          expectedProjection: "<p><a>x</a> |</p>",
          expectedMarkdown: "[x]()\u00a0",
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
            "<p><pending>[</pending><pending>](</pending><link-url>u</link-url><pending>)</pending>|</p>",
          expectedMarkdown: "[](u)",
        },
        {
          step: 10,
          expectedProjection:
            "<p><pending>[</pending><pending>](</pending><link-url>u</link-url><pending>)</pending> <pending>[</pending><pending>](</pending><pending>)</pending>|</p>",
          expectedMarkdown: "[](u) []()",
        },
      ],
    },
    {
      id: "live-link-empty-label-stays-source-on-cursor-leave",
      title: "Empty label stays source projection when cursor leaves",
      initialMarkdown: "",
      keyevents: ["[", "]", "(", "u", ")", "ArrowLeft", "ArrowRight"],
      checkpoints: [
        {
          step: 7,
          expectedProjection:
            "<p><pending>[</pending><pending>](</pending><link-url>u</link-url><pending>)</pending>|</p>",
          expectedMarkdown: "[](u)",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
