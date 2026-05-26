## Agent skills

### Issue tracker

Issues live in the `fEyebrow/rich-text-editor` GitHub repo, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — label strings equal the canonical role names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## TDD workflow

按键触发型功能走 `/tdd`（红→绿→重构），测试落点为 `packages/editor/src/specs/features/[feature].cases.ts`，并由 `packages/editor/src/specs/index.ts` 的显式 registry 汇总导出。每轮只新增一个 case 或 checkpoint，跑红后再实现，避免一次性铺满 spec。
