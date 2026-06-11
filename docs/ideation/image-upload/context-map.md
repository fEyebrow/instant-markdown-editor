# Context Map — Image Paste & Drop Upload (Phase 1)

**Verdict**: GO（confidence 90/100）
**Source**: 本会话 ideation 阶段的全量 inline 勘探（scout 子代理会冷启动重复同样工作，按 execute-spec 的 inline fallback 路径落档）

## Key Patterns

- **Decoration plugin 结构**: `packages/editor/src/features/image-widgets.ts` — `Plugin<DecorationSet>` + `state.init/apply` + `props.decorations`，每次从 state 重建/映射 DecorationSet
- **图片渲染**: `image-widgets.ts` 在 image span `closeTo` 位置放 `Decoration.widget(pos, () => buildImage(...), { side: 1 })`；img class `md-image-widget`
- **image 文本语法**: `features/image.ts` `IMAGE_RE = /!\[([^\]\n]*?)\]\(([^\s)\n]*)(?:\s+"([^"\n]*)")?\)/g` — alt 禁 `]` 和换行，URL 禁空白与 `)`
- **options 接线**: `src/index.ts` `createEditor` 解构 options，plugins 数组按条件展开（`cursorProjection` 已有先例）
- **测试风格**: `tests/index.test.ts` — `vite-plus/test` 的 `test/expect`，`document.createElement("div")` 挂载，`view.someProp("clipboardTextParser", f => f(...))` 直接驱动 props；helpers 在 `tests/helpers.ts`

## Dependencies / Blast Radius

- `src/index.ts` 是唯一入口，被 playground 与所有测试引用；新增可选 options 向后兼容
- `imageUploadPlugin` 不进 `features/index.ts` 的 `featureSpecs`（feature.plugins 拿不到 EditorOptions）——createEditor 直接实例化
- 新依赖 `prosemirror-dropcursor`（packages/editor/package.json，现有 PM 依赖混用 `^x.y.z` 与 `catalog:`）

## Conventions

- 文件内 import 带 `.ts` 后缀；type-only import 用 `import type`
- class 命名 `md-*` 前缀（`md-image-widget`、`md-image-source`、`md-pending`）
- 样式集中在 `packages/editor/src/style.css`
- 测试名是需求句子；每 case 一个行为拐点

## Risks

- **同 pos 多 placeholder 的顺序**：spec 声称"完成顺序不影响视觉顺序"，但同一 pos 的多个 widget 在映射上不可区分——先完成者先插入会乱序。需串行化 finish 步骤（上传并发、插入按文件序链式）
- **jsdom 无 `URL.createObjectURL`**：placeholder 预览需存在性 guard
- **`projectEditorView` 会序列化 placeholder 内的 `<img>`**（blob URL 不稳定）：jsdom 下无预览所以投影不受影响；上传中断言用 querySelector
- **insertText 落点合法性**：drop 的 posAtCoords 可能落在非 textblock，placeholder 创建前用 `TextSelection.near` 归一
- spec runner（`specs/runner.ts`）只支持键盘 token——行为测试必须走独立 `tests/image-upload.test.ts`
