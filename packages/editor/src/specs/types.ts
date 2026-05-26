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

export type EditorSpecCheckpointDefinition = { step: number } & Partial<
  Omit<EditorSpecCheckpoint, "step">
>;

export interface EditorSpecCaseDefinition {
  id: string;
  title: string;
  initialMarkdown?: string;
  keyevents: string[];
  checkpoints: EditorSpecCheckpointDefinition[];
}

export interface EditorSpecFeatureDefinition {
  id: string;
  title: string;
  cases: EditorSpecCaseDefinition[];
}
