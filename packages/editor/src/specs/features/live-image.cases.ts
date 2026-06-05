import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveImageSpec = {
  id: "live-image",
  title: "Live Image",
  cases: [
    {
      id: "live-image-source-projects",
      title: "'![x](y)' projects with widget plus pending source at cursor",
      initialMarkdown: "",
      keyevents: ["!", "[", "x", "]", "(", "y", ")"],
      checkpoints: [
        {
          step: 7,
          expectedProjection:
            '<p><img src="y" alt="x"><pending>![</pending><pending>x</pending><pending>](y)</pending>|</p>',
          expectedMarkdown: "![x](y)",
        },
      ],
    },
    {
      id: "live-image-hides-source-on-leave",
      title: "Typing Space after image hides source and keeps widget",
      initialMarkdown: "",
      keyevents: ["!", "[", "x", "]", "(", "y", ")", " "],
      checkpoints: [
        {
          step: 8,
          expectedProjection: '<p><img src="y" alt="x"> |</p>',
          expectedMarkdown: "![x](y) ",
        },
      ],
    },
    {
      id: "live-image-reveals-on-cursor-enter",
      title: "ArrowLeft into rendered image reveals source",
      initialMarkdown: "![x](y)",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection:
            '<p><img src="y" alt="x"><pending>![</pending><pending>x</pending><pending>](y</pending>|<pending>)</pending></p>',
          expectedMarkdown: "![x](y)",
        },
      ],
    },
    {
      id: "live-image-empty-url-keeps-source-visible",
      title: "Empty url '![a]()' keeps source visible and emits no widget",
      initialMarkdown: "![a]()",
      keyevents: ["ArrowDown"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p>![a]()|</p>",
          expectedMarkdown: "![a]()",
        },
      ],
    },
    {
      id: "live-image-empty-url-no-widget-even-on-leave",
      title: "Empty url stays plain source after trailing Space",
      initialMarkdown: "",
      keyevents: ["!", "[", "a", "]", "(", ")", " "],
      checkpoints: [
        {
          step: 7,
          expectedProjection: "<p>![a]() |</p>",
          expectedMarkdown: "![a]() ",
        },
      ],
    },
    {
      id: "live-image-broken-source-loses-widget",
      title: "Backspacing ')' drops widget; retyping ')' restores it",
      initialMarkdown: "![x](y)",
      keyevents: ["Backspace", ")"],
      checkpoints: [
        {
          step: 1,
          title: "broken source becomes plain text",
          expectedProjection: "<p>![x](y|</p>",
          expectedMarkdown: "![x](y",
        },
        {
          step: 2,
          title: "repaired source restores widget",
          expectedProjection:
            '<p><img src="y" alt="x"><pending>![</pending><pending>x</pending><pending>](y)</pending>|</p>',
          expectedMarkdown: "![x](y)",
        },
      ],
    },
    {
      id: "live-image-does-not-trigger-on-bracket-only",
      title: "'[x](y)' without leading '!' triggers link only, no image widget",
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
      id: "live-image-coexists-with-leading-text",
      title: "'hi ![y](z) ' renders widget mid-paragraph and hides source on leave",
      initialMarkdown: "",
      keyevents: ["h", "i", " ", "!", "[", "y", "]", "(", "z", ")", " "],
      checkpoints: [
        {
          step: 11,
          expectedProjection: '<p>hi <img src="z" alt="y"> |</p>',
          expectedMarkdown: "hi ![y](z) ",
        },
      ],
    },
    {
      id: "live-image-alt-keeps-inline-markup-as-plain",
      title: "Alt text '**a**' stays plain inside the image source",
      initialMarkdown: "![**a**](b)",
      keyevents: ["ArrowDown"],
      checkpoints: [
        {
          step: 1,
          expectedProjection:
            '<p><img src="b" alt="**a**"><pending>![</pending><pending>**a**</pending><pending>](b)</pending>|</p>',
          expectedMarkdown: "![**a**](b)",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
