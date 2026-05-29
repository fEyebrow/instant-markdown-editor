import type { EditorSpecFeatureDefinition } from "../types.ts";

export const projectionCursorSpec = {
  id: "projection-cursor",
  title: "Projection Cursor",
  cases: [
    {
      id: "projection-cursor-absorbs-left-at-inline-code-end",
      title: "Cursor absorbs left at inline code end",
      initialMarkdown: "`==1=|=`",
      keyevents: ["ArrowRight"],
      checkpoints: [
        {
          step: 1,
          expectedProjection: "<p><code>==1==|</code></p>",
          expectedMarkdown: "`==1==`",
        },
      ],
    },
    {
      id: "projection-cursor-absorbs-right-between-live-inline-markers",
      title: "Cursor absorbs right between live inline markers",
      initialMarkdown: "|",
      keyevents: ["*", "=", "=", "1", "=", "=", "*", " ", "ArrowLeft", "ArrowLeft"],
      checkpoints: [
        {
          step: 10,
          expectedProjection:
            "<p><pending>*</pending><pending>==</pending><mark><i>1</i></mark><pending>==</pending><pending>|*</pending> </p>",
          expectedMarkdown: "*==1==*\u00a0",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
