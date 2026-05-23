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
            expectedProjection: "<p><pending>*</pending>1<pending>*</pending>|</p>",
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
            expectedProjection: "<p><pending>*</pending>1<pending>*</pending>|</p>",
            expectedMarkdown: "*1*",
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
