基于 ProseMirror 的类 Typora WYSIWYG Markdown editor。

## Repo layout

- `apps/playground` 手动验证用 vite 应用（不是测试入口）
- `packages/editor` 编辑器本体（schema / features / markdown / specs）
- `docs/adr` 架构决策（ADR-0001 覆盖 inline mark normalize 结构）
- `CONTEXT.md` inline mark 词汇表

## Core files

- `schema/index.ts` ProseMirror schema；node 写在这里，mark 由 features 汇入
- `features/` 每个 markdown 语法一个文件，统一在 `features/index.ts` 注册
  - `inline-parse.ts` parseInline 统一裁判：按 priority 询问各 inline feature 的 scan，合并 spans，拒绝 crossing
  - `inline-normalize.ts` normalize plugin：从 parseInline 结果同步 semantic marks，导出 delim ranges
  - `inline-decorations.ts` syntax hints：按光标位置把真实 delimiter 显示成 pending 或隐藏
  - `<feature>.ts` 单个 feature 的 FeatureSpec；inline 类还要声明 `scan` / `priority` / `markNames` / `extRanges`
- `markdown/` Markdown ↔ ProseMirror 双向（parser / serializer / paste）
- `specs/` 行为 spec：`features/*.cases.ts` → `specs/index.ts` registry
- `specs/runner.ts` spec 执行入口：`applyActions` 模拟输入 / 按键，`setSpecMarkdown` 用 Markdown 初始化编辑器，`projectEditorView` 把当前 EditorView DOM 投影成稳定 HTML-like 字符串，用于断言 cursor、pending marker、hidden delimiter、live mark 样式等用户可见状态

## TDD workflow

功能开发和行为修复优先走 TDD：红 → 绿 → 重构。每轮只新增一个最小可验证行为，先看到失败，再实现刚好足够的代码让它通过，最后整理命名、结构和重复。

- 先在 `packages/editor/src/specs/features/*.cases.ts` 写用户可见行为 case；需要新文件时，在 `packages/editor/src/specs/index.ts` 注册。
- 用 `vp test` 跑红，确认失败来自当前目标行为，而不是测试写错或无关回归。
- 实现最小改动，让新增 case 变绿；避免顺手扩展未覆盖的行为。
- 绿灯后再重构，并保持 `vp test` 通过。
- 涉及类型、lint、构建或跨模块契约时，最后跑 `vp check` 或 `pnpm ready`。

## Inline markdown feature guide

只有在添加或修改 inline markdown feature 时，阅读 `docs/inline-mark-feature-guide.md`。其中记录 inline mark architecture、feature 文件职责和新增 inline markdown feature 的 TDD 流程。

## Agent skills

### Issue tracker

Issues live in the `fEyebrow/rich-text-editor` GitHub repo, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — label strings equal the canonical role names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## 常用命令

- `pnpm dev` 启动 playground
- `vp test` 跑 spec 测试
- `vp check` 类型与 lint
- `pnpm ready` 全量 check + test + build
