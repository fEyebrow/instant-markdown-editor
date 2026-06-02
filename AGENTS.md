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

## Inline mark architecture

Inline mark 统一走 `parseInline → normalize → decorations → serializer` 管线，不允许单个 feature 自建第二套 live mark 状态。

核心不变量：

- Source text 是编辑态事实来源。Delimiter 是真实文档字符，不是 widget，也不是隐藏状态。
- `parseInline` 是 inline source 的唯一裁判入口：按 `priority` 调用各 feature 的 `scan`，统一处理 consumed delimiter、crossing 冲突和 inline code isolation。
- Normalize 只从当前文档文本和 `parseInline` 结果收敛 semantic marks；不解释“刚按了什么键”，也不保存独立 live mark 状态。
- Decorations 只负责显示真实 delimiter：pending、hidden、link-label/link-url 等视觉状态；不负责判断 source 是否成立，也不替代 semantic mark。
- Markdown serializer 只读取文档语义和 source projection；source projection 中已有真实 delimiter 时，不能再额外包一层 delimiter。

Feature 文件职责：

- 在 `features/<feature>.ts` 声明该 feature 的完整能力：`marks`、Markdown-it plugin、parser token handler、serializer delimiter、`inline.scan` / `priority` / `markNames` / `extRanges`。
- feature 的 `scan` 只描述自己的局部 Markdown source 如何成立；跨 feature 的冲突、嵌套、delimiter 消费和隐藏策略交给统一管线。
- 新 inline feature 必须注册到 `features/index.ts` 的 `featureSpecs`，由 registry 收集 marks、parser tokens、mark delims、inline scans、plugins、keymaps。
- 新增 decoration class 或新的 live visual state 时，同步扩展 `projectEditorView`，让 spec 能断言用户可见编辑态。

## 如何添加一个 inline markdown feature

流程（按键触发型功能走 `/tdd`，红→绿→重构；每轮只新增一个 case 或 checkpoint，跑红后再实现）：

1. 在 `specs/features/<feature>.cases.ts` 写一个红的 case 或 checkpoint
2. 在 `specs/index.ts` 注册新 cases 文件（首轮）
3. 在 `packages/editor/src/features/<feature>.ts` 实现 FeatureSpec：声明 `marks`、Markdown parse / serialize 规则和 `inline` spec；`inline.scan` 只识别本 feature 的 source span，并标注 delimiter ranges；用 `priority` 表达冲突顺序，不要在 feature 内私自处理 crossing、清理其它 mark、隐藏 delimiter 或维护 live 状态
4. 在 `features/index.ts` 注册到 `featureSpecs`（首轮），让 registry 收集 schema / Markdown IO / inline scans / plugins / keymaps
5. 如果新增 decoration class 或可见状态，同步扩展 `projectEditorView`
6. `vp test` 跑绿，回到第 1 步加下一个 case

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
