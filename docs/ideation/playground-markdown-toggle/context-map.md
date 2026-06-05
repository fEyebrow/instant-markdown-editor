# Context Map: playground-markdown-toggle

**Phase**: 1
**Scout Confidence**: 86/100
**Verdict**: GO

## Dimensions

| Dimension            | Score | Notes                                                                                                                                                                                                                                                                                             |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope clarity        | 19/20 | Spec is explicit: only `apps/playground/src/main.ts` + `style.css` change. No editor-package edits. New behavior (view state, Mod+/ handler) is well-described.                                                                                                                                   |
| Pattern familiarity  | 18/20 | Existing `renderEditor` at `main.ts:30` uses innerHTML + querySelector — direct template to extend. `TextSelection.create` usage pattern available in `packages/editor/src/specs/runner.ts:109` as reference for doc cursor mapping.                                                              |
| Dependency awareness | 18/20 | `EditorHandle` confirmed at `packages/editor/src/index.ts:21-26` exposes `view`, `getMarkdown()`, `setMarkdown()`. `setMarkdown` rebuilds state via `EditorState.create` (no selection preserved — caller must dispatch own selection tx). Only consumer of `main.ts` is `index.html` script tag. |
| Edge case coverage   | 17/20 | Spec covers IME composition guard, quick-find swallow, hidden-attribute CSS fallback, delimiter offset drift. Open: behavior when textarea contains unsupported markdown (declared not-fixed).                                                                                                    |
| Test strategy        | 14/20 | Spec explicitly waives automated tests (`vp test` doesn't cover playground UI). Manual checklist is concrete. Risk: regression on `/specs` route only caught by visiting it.                                                                                                                      |

## Key Patterns

- `apps/playground/src/main.ts:30-70` — `renderEditor` template + mount pattern: `root.innerHTML = ...`, then `querySelector` for `#editor` mount, then `createEditor({ mount, initialMarkdown, onChange })`. Replicate single-column layout in same style.
- `apps/playground/src/main.ts:72-84` — `renderTopbar` reused; nav `/specs` link must remain intact.
- `packages/editor/src/specs/runner.ts:2,109` — `TextSelection.create(doc, position)` + `view.dispatch(view.state.tr.setSelection(...))` pattern for restoring cursor after `setMarkdown`. Import from `prosemirror-state` (already in playground `package.json` deps).
- `packages/editor/src/index.ts:59-67` — `setMarkdown` does `EditorState.create` reusing existing plugins, so history is reset; selection is not set (defaults to start). Caller must dispatch a follow-up selection tx for cursor mapping.

## Dependencies

- `apps/playground/src/main.ts` — consumed by → `apps/playground/index.html:11` (`<script type="module" src="/src/main.ts">`); only entry point.
- `apps/playground/src/main.ts:3` — imports `createEditor` from `instant-markdown-editor` (alias → `packages/editor/src/index.ts` via `vite.config.ts`).
- `apps/playground/src/main.ts:4` — `renderSpecs` from `./specs.ts`; `/specs` route still branches at `main.ts:24-28` — must remain untouched.
- `apps/playground/src/style.css` — consumed only by `main.ts:2` import; classes `.editor-grid` / `.side-card*` referenced only in this file + `main.ts` (no other call sites).
- `apps/playground/package.json` — already declares `prosemirror-state` as runtime dep, so `import { TextSelection } from "prosemirror-state"` is allowed without dep changes.

## Conventions

- **Naming**: camelCase functions (`renderEditor`, `renderTopbar`); kebab-case CSS classes (`editor-grid`, `side-card-muted`). New types: `ViewMode`, `PlaygroundState` per spec.
- **Imports**: `.ts` extensions used (`./specs.ts`, `./style.css`). Workspace alias `instant-markdown-editor` for editor package. Use ES module `import` (file is `"type": "module"`).
- **Error handling**: No try/catch in current `renderEditor`; spec doesn't require new error handling. `setMarkdown` silently no-ops on parse failure (`packages/editor/src/index.ts:60-61`) — acceptable per spec failure-mode table.
- **Types**: TypeScript strict (tsc in build). Use explicit type annotations on exported/closure-captured state objects. `HTMLElement` / `HTMLTextAreaElement` for DOM refs (matches existing `querySelector<HTMLElement>` pattern).
- **Testing**: No automated coverage required. `vp check` (tsc + lint) + manual `pnpm dev` per spec. `vp test` only needs to not regress import-wise.

## Risks

- **`/specs` route regression**: `main.ts` branches on pathname; if `renderTopbar` or shared CSS classes are mutated carelessly, `/specs` page (sharing `style.css`) could break. Spec mandates keeping old `.editor-grid` / `.side-card*` rules in style.css to be safe.
- **`setMarkdown` rebuilds state without selection**: Cursor mapping must dispatch its own `TextSelection` transaction AFTER `setMarkdown` returns, since `EditorState.create` in `setMarkdown` (index.ts:62-67) does not accept a selection. Also resets undo history — acceptable for this playground but worth noting.
- **`hidden` attribute vs CSS**: Current `style.css` has no `[hidden]` override, but `.editor-card .ProseMirror { min-height: 18rem; padding: ... }` (line 176-180) styles inner content, not the card itself — should be safe. Still, add explicit `[hidden] { display: none !important }` fallback per spec failure-mode mitigation.
- **`navigator.platform` deprecation**: Spec uses `navigator.platform` for Mac detection; deprecated but still functional. No need to switch to `userAgentData` for a playground.
- **`onChange` callback dead code**: Current `onChange` updates `source.textContent`; after refactor there is no live preview, so the callback can be dropped entirely (or left as no-op). Spec step 2.3 says delete the常驻预览逻辑.
- **`textBetween` separator**: Use `"\n"` as block separator (per spec line 149) so the textarea offset roughly matches paragraph-newline-joined markdown; using `""` would collapse blocks and skew cursor mapping more.
