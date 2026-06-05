export { EDITOR_SPEC_FEATURES } from "./specs/index.ts";
export type { EditorSpecCase, EditorSpecCheckpoint, EditorSpecFeature } from "./specs/index.ts";
export {
  applyAction,
  applyActions,
  parseChord,
  projectEditorView,
  setSpecMarkdown,
} from "./specs/runner.ts";
export type { Chord, ProjectionOptions } from "./specs/runner.ts";
