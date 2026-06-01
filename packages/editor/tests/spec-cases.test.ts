import { expect, test } from "vite-plus/test";
import {
  applyActions,
  createEditor,
  EDITOR_SPEC_FEATURES,
  projectEditorView,
  setSpecMarkdown,
} from "../src/index.ts";

for (const feature of EDITOR_SPEC_FEATURES) {
  for (const specCase of feature.cases) {
    test(`${feature.id} / ${specCase.id} matches checkpoints`, () => {
      const mount = document.createElement("div");
      const editor = createEditor({ mount, cursorProjection: true });
      setSpecMarkdown(editor.view, specCase.initialMarkdown ?? "");
      const checkpoints = new Map(
        specCase.checkpoints.map((checkpoint) => [checkpoint.step, checkpoint]),
      );
      try {
        specCase.keyevents.forEach((keyevent, index) => {
          applyActions(editor.view, [keyevent]);
          const step = index + 1;
          const checkpoint = checkpoints.get(step);
          if (!checkpoint) return;

          expect(
            projectEditorView(editor),
            `${specCase.id} step ${step} (${checkpoint.title})`,
          ).toBe(checkpoint.expectedProjection);
          expect(editor.getMarkdown(), `${specCase.id} step ${step} markdown`).toBe(
            checkpoint.expectedMarkdown,
          );
        });
      } finally {
        editor.destroy();
      }
    });
  }
}

test("EDITOR_SPEC_FEATURES ids, keyevents, and checkpoints are well-formed", () => {
  const featureIds = new Set<string>();
  const caseIds = new Set<string>();

  for (const feature of EDITOR_SPEC_FEATURES) {
    expect(feature.id, "feature id").not.toBe("");
    expect(featureIds.has(feature.id), `duplicate feature id: ${feature.id}`).toBe(false);
    featureIds.add(feature.id);
    expect(feature.cases.length, `${feature.id} cases`).toBeGreaterThan(0);

    for (const specCase of feature.cases) {
      expect(specCase.id, "case id").not.toBe("");
      expect(caseIds.has(specCase.id), `duplicate case id: ${specCase.id}`).toBe(false);
      caseIds.add(specCase.id);
      expect(specCase.initialMarkdown, `${specCase.id} initialMarkdown`).not.toBeUndefined();
      expect(specCase.keyevents.length, `${specCase.id} keyevents`).toBeGreaterThan(0);
      expect(specCase.checkpoints.length, `${specCase.id} checkpoints`).toBeGreaterThan(0);

      specCase.keyevents.forEach((keyevent, index) => {
        expect(keyevent, `${specCase.id} keyevent ${index + 1}`).not.toBe("");
      });

      const checkpointSteps = new Set<number>();
      specCase.checkpoints.forEach((checkpoint) => {
        expect(checkpoint.step, `${specCase.id} checkpoint step`).toBeGreaterThan(0);
        expect(checkpoint.step, `${specCase.id} checkpoint step`).toBeLessThanOrEqual(
          specCase.keyevents.length,
        );
        expect(
          checkpointSteps.has(checkpoint.step),
          `${specCase.id} duplicate checkpoint step: ${checkpoint.step}`,
        ).toBe(false);
        checkpointSteps.add(checkpoint.step);
        expect(checkpoint.title, `${specCase.id} step ${checkpoint.step} title`).not.toBe("");
        expect(
          checkpoint.expectedProjection,
          `${specCase.id} step ${checkpoint.step} expectedProjection`,
        ).not.toBe("");
        expect(
          checkpoint.expectedMarkdown,
          `${specCase.id} step ${checkpoint.step} expectedMarkdown`,
        ).not.toBe("");
      });
    }
  }
});
