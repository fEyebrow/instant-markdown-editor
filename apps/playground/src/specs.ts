import { createEditor } from "instant-markdown-editor";
import {
  applyActions,
  EDITOR_SPEC_FEATURES,
  type EditorSpecCase,
  projectEditorView,
  setSpecMarkdown,
} from "instant-markdown-editor/specs";
import type { Selection } from "prosemirror-state";
import { editorPath, specsPath } from "./routes.ts";

interface Snapshot {
  index: number;
  projection: string;
  expectedProjection: string | null;
  markdown: string;
  expectedMarkdown: string | null;
  passed: boolean | null;
}

const FEATURES = EDITOR_SPEC_FEATURES;

export function renderSpecs(root: HTMLElement): void {
  let activeFeatureId = FEATURES[0]?.id ?? "";

  root.innerHTML = `
    <div class="shell docs-shell">
      <header class="topbar">
        <div class="brandrow">
          <a class="brandmark" href="${editorPath}">Typora</a>
          <nav class="topnav" aria-label="Sections">
            <a class="navlink" href="${editorPath}">Editor</a>
            <a class="navlink active" href="${specsPath}">Specs</a>
          </nav>
        </div>
      </header>
      <main class="page-wrap page-wrap-top specs-page-wrap">
        <section class="specs-shell">
          <aside class="specs-sidebar">
            <div class="specs-sidebar-head">
              <h2>Cases</h2>
            </div>
            <nav id="feature-list" class="feature-list" aria-label="Feature specs"></nav>
          </aside>
          <section class="specs-content">
            <div class="specs-content-head">
              <div>
                <h2 id="feature-title"></h2>
              </div>
            </div>
            <div id="spec-case-list" class="spec-case-list"></div>
          </section>
        </section>
      </main>
    </div>
  `;

  const featureList = root.querySelector<HTMLElement>("#feature-list")!;
  const featureTitle = root.querySelector<HTMLElement>("#feature-title")!;
  const caseList = root.querySelector<HTMLElement>("#spec-case-list")!;

  renderFeatureList();
  renderActiveFeature();

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const featureButton = target.closest<HTMLElement>("[data-feature-id]");
    const featureId = featureButton?.dataset.featureId;
    if (featureId && featureId !== activeFeatureId) {
      activeFeatureId = featureId;
      renderFeatureList();
      renderActiveFeature();
    }
  });

  function renderFeatureList(): void {
    featureList.innerHTML = FEATURES.map((feature) => {
      const isActive = feature.id === activeFeatureId;
      return `
        <button
          type="button"
          class="feature-item${isActive ? " active" : ""}"
          data-feature-id="${feature.id}"
        >
          <span class="feature-item-title">${feature.title}</span>
        </button>
      `;
    }).join("");
  }

  function renderActiveFeature(): void {
    const feature = FEATURES.find((item) => item.id === activeFeatureId) ?? FEATURES[0];
    if (!feature) return;

    featureTitle.textContent = feature.title;
    caseList.innerHTML = "";

    for (const specCase of feature.cases) {
      const mount = document.createElement("section");
      mount.className = "spec-case-card";
      caseList.append(mount);
      mountSpecCase(mount, specCase);
    }
  }
}

function mountSpecCase(root: HTMLElement, specCase: EditorSpecCase): void {
  root.innerHTML = `
    <div class="spec-case-head">
      <div>
        <h3>${specCase.title}</h3>
        <p class="hint" data-role="step-summary"></p>
      </div>
      <div class="player-meta">
        <span data-role="progress-text">0/${specCase.keyevents.length}</span>
        <div class="toolbar toolbar-tight">
          <button type="button" data-action="reset">Reset</button>
          <button type="button" data-action="step">Step</button>
          <button type="button" data-action="play" data-role="play-button">Play</button>
        </div>
      </div>
    </div>

    <section class="editor-stage">
      <div class="editor-stage-surface">
        <div data-role="editor"></div>
      </div>
    </section>

    <section class="projection-card">
      <div class="projection-head">
        <span>editorview dom</span>
        <button type="button" class="copylink" data-action="copy-projection">copy</button>
      </div>
      <pre data-role="projection-out" class="projection-output"></pre>
    </section>

    <section class="projection-card">
      <div class="projection-head">
        <span>markdown</span>
        <button type="button" class="copylink" data-action="copy-markdown">copy</button>
      </div>
      <pre data-role="markdown-out" class="projection-output"></pre>
    </section>

    <section class="history-card">
      <div class="history-head">
        <span>checkpoints</span>
        <span data-role="checkpoint-text">0/${specCase.checkpoints.length}</span>
      </div>
      <ol data-role="history-out" class="history-list"></ol>
    </section>
  `;

  const mount = root.querySelector<HTMLElement>('[data-role="editor"]')!;
  const stepSummary = root.querySelector<HTMLElement>('[data-role="step-summary"]')!;
  const projectionOut = root.querySelector<HTMLElement>('[data-role="projection-out"]')!;
  const markdownOut = root.querySelector<HTMLElement>('[data-role="markdown-out"]')!;
  const historyOut = root.querySelector<HTMLOListElement>('[data-role="history-out"]')!;
  const playButton = root.querySelector<HTMLButtonElement>('[data-role="play-button"]')!;
  const progressText = root.querySelector<HTMLElement>('[data-role="progress-text"]')!;
  const checkpointText = root.querySelector<HTMLElement>('[data-role="checkpoint-text"]')!;

  const editor = createEditor({
    mount,
    onChange: updateOutputs,
    cursorProjection: true,
    scrollToSelection: false,
  });

  const checkpoints = new Map(
    specCase.checkpoints.map((checkpoint) => [checkpoint.step, checkpoint]),
  );
  let currentStep = 0;
  let playTimer: number | null = null;
  let preservedReplaySelection: Selection | null = null;
  let snapshots: Snapshot[] = [];

  root.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action === "step" || action === "play") {
      preservedReplaySelection = editor.view.state.selection;
    }
  });

  root.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (!action) return;

    if (action === "reset") resetEditor();
    if (action === "step") runNextStep();
    if (action === "play") togglePlay();
    if (action === "copy-projection") {
      await navigator.clipboard.writeText(projectionOut.textContent ?? "");
    }
    if (action === "copy-markdown") {
      await navigator.clipboard.writeText(markdownOut.textContent ?? "");
    }
  });

  resetEditor();

  function resetEditor(): void {
    stopPlay();
    setSpecMarkdown(editor.view, specCase.initialMarkdown ?? "");
    currentStep = 0;
    snapshots = [makeSnapshot(0)];
    updateOutputs();
  }

  function runNextStep(): void {
    if (currentStep >= specCase.keyevents.length) {
      stopPlay();
      return;
    }

    restoreReplaySelection();
    const keyevent = specCase.keyevents[currentStep];
    applyActions(editor.view, [keyevent]);
    currentStep += 1;
    snapshots = [...snapshots, makeSnapshot(currentStep)];
    updateOutputs();

    if (currentStep >= specCase.keyevents.length) stopPlay();
  }

  function togglePlay(): void {
    if (playTimer !== null) {
      stopPlay();
      return;
    }

    if (currentStep >= specCase.keyevents.length) resetEditor();

    playButton.textContent = "Pause";
    playTimer = window.setInterval(() => {
      runNextStep();
      if (currentStep >= specCase.keyevents.length) stopPlay();
    }, 900);
  }

  function stopPlay(): void {
    if (playTimer !== null) {
      window.clearInterval(playTimer);
      playTimer = null;
    }
    playButton.textContent = "Play";
  }

  function restoreReplaySelection(): void {
    if (!preservedReplaySelection) return;
    const selection = preservedReplaySelection;
    preservedReplaySelection = null;
    if (!selection.$from.doc.eq(editor.view.state.doc)) return;
    editor.view.dispatch(editor.view.state.tr.setSelection(selection));
  }

  function updateOutputs(): void {
    const activeCheckpoint = currentStep === 0 ? null : (checkpoints.get(currentStep) ?? null);

    stepSummary.textContent =
      currentStep === 0
        ? "Ready. Start from an empty paragraph and replay the test sequence."
        : activeCheckpoint
          ? activeCheckpoint.title
          : `Step ${currentStep}: played ${specCase.keyevents[currentStep - 1]}`;

    progressText.textContent = `${currentStep}/${specCase.keyevents.length}`;
    const passedCount = snapshots.filter((snapshot) => snapshot.passed === true).length;
    const failedCount = snapshots.filter((snapshot) => snapshot.passed === false).length;
    checkpointText.textContent =
      failedCount > 0
        ? `${passedCount} passed, ${failedCount} failed`
        : `${passedCount}/${specCase.checkpoints.length} passed`;
    projectionOut.textContent = projectEditorView(editor);
    markdownOut.textContent = editor.getMarkdown();
    historyOut.innerHTML = snapshots
      .map((snapshot) => renderSnapshot(snapshot, snapshot.index === currentStep))
      .join("");
  }

  function makeSnapshot(index: number): Snapshot {
    const projection = projectEditorView(editor);
    const markdown = editor.getMarkdown();
    const checkpoint = index === 0 ? null : (checkpoints.get(index) ?? null);
    const expectedProjection = checkpoint?.expectedProjection ?? null;
    const expectedMarkdown = checkpoint?.expectedMarkdown ?? null;
    const projectionPassed = expectedProjection === null || projection === expectedProjection;
    const markdownPassed = expectedMarkdown === null || markdown === expectedMarkdown;

    return {
      index,
      projection,
      expectedProjection,
      markdown,
      expectedMarkdown,
      passed: expectedProjection === null ? null : projectionPassed && markdownPassed,
    };
  }
}

function renderSnapshot(snapshot: Snapshot, isActive: boolean): string {
  const label = `@${snapshot.index}`;
  const status = snapshot.passed === null ? "ready" : snapshot.passed ? "pass" : "fail";
  const statusLabel = status.toUpperCase();
  const expected = snapshot.expectedProjection;
  const expectedMarkdown = snapshot.expectedMarkdown;

  return `
    <li class="history-item ${status}${isActive ? " active" : ""}">
      <span class="history-index">${label}</span>
      <div class="history-body">
        <span class="history-status">${statusLabel}</span>
        ${
          expected === null
            ? `<pre class="history-value">${escapeHtml(snapshot.projection)}</pre>`
            : `
              <dl class="assertion">
                <div>
                  <dt>expected</dt>
                  <dd><pre class="history-value">${escapeHtml(expected)}</pre></dd>
                </div>
                <div>
                  <dt>actual</dt>
                  <dd><pre class="history-value">${escapeHtml(snapshot.projection)}</pre></dd>
                </div>
                ${
                  expectedMarkdown === null
                    ? ""
                    : `
                      <div>
                        <dt>expected markdown</dt>
                        <dd><pre class="history-value">${escapeHtml(expectedMarkdown)}</pre></dd>
                      </div>
                      <div>
                        <dt>actual markdown</dt>
                        <dd><pre class="history-value">${escapeHtml(snapshot.markdown)}</pre></dd>
                      </div>
                    `
                }
              </dl>
            `
        }
      </div>
    </li>
  `;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
