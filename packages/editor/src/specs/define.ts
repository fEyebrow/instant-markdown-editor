import type {
  EditorSpecCheckpoint,
  EditorSpecCheckpointDefinition,
  EditorSpecFeature,
  EditorSpecFeatureDefinition,
} from "./types.ts";

export function defineEditorSpecFeatures(
  features: EditorSpecFeatureDefinition[],
): EditorSpecFeature[] {
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
