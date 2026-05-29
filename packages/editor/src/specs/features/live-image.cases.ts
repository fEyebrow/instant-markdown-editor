import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveImageSpec = {
  id: "live-image",
  title: "Live Image",
  cases: [
    {
      id: "live-image-basic-source-projection",
      title: "Basic source projection",
      initialMarkdown: "|",
      keyevents: ["!", "[", "x", "]", "(", "y", ")"],
      checkpoints: [
        {
          step: 7,
          expectedProjection:
            "<p><image-state>image</image-state><pending>![</pending><image-alt>x</image-alt><pending>](</pending><image-src>y</image-src><pending>)</pending><image-loading>loading|</image-loading></p>",
          expectedMarkdown: "![x](y)",
        },
      ],
    },
    {
      id: "live-image-complete-empty-forms-project",
      title: "Complete empty forms project",
      initialMarkdown: "|",
      keyevents: ["!", "[", "]", "(", "u", ")", " ", "!", "[", "]", "(", ")"],
      checkpoints: [
        {
          step: 6,
          expectedProjection:
            "<p><image-state>image</image-state><pending>![</pending><pending>](</pending><image-src>u</image-src><pending>)</pending><image-loading>loading|</image-loading></p>",
          expectedMarkdown: "![](u)",
        },
        {
          step: 12,
          expectedProjection:
            "<p><image-state>image</image-state><pending>![</pending><pending>](</pending><image-src>u</image-src><pending>)</pending><image-loading>loading</image-loading> <image-state>image</image-state><pending>![</pending><pending>](</pending><pending>)|</pending></p>",
          expectedMarkdown: "![](u) ![]()",
        },
      ],
    },
    {
      id: "live-image-incomplete-source-stays-text",
      title: "Incomplete source stays plain text",
      initialMarkdown: "|",
      keyevents: ["!", "[", "x", "]", "("],
      checkpoints: [
        {
          step: 5,
          expectedProjection: "<p>![x](|</p>",
          expectedMarkdown: "!\\[x\\](",
        },
      ],
    },
    {
      id: "live-image-broken-source-removes-projection",
      title: "Broken source removes projection",
      initialMarkdown: "|",
      keyevents: ["!", "[", "x", "]", "(", "y", ")", "Backspace"],
      checkpoints: [
        {
          step: 8,
          expectedProjection: "<p>![x](y|</p>",
          expectedMarkdown: "!\\[x\\](y",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
