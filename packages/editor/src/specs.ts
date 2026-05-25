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
