# Markdown Image Feature Contract

**Created**: 2026-06-05
**Confidence Score**: 95/100
**Status**: Approved (MVP scope)
**Supersedes**: None

## Problem Statement

编辑器目前不识别 `![alt](url)` markdown 图片语法。用户在 source 里写出图片标记时，只看到原始文本，无法获得 Typora 那种 inline 渲染体验。

项目已有完整的 inline mark 流水线 (`parseInline` / `normalize` / `decorations`)，link `[x](y)` 已经走 source-retained 模式。但 image 与 link 有一个关键不同：image 没有可见的 label text，需要在源文本之外额外注入一个 `<img>` widget。这要求在现有架构内引入第一个 widget decoration，且不破坏 ADR-0001 的 source-retained 原则。

## Goals

1. **Source-retained**：文档里始终保留 `![alt](url)` 原始字符；光标进入源范围可编辑，Markdown serializer 输出原文。
2. **Typora-like 投影**：光标离开源范围时隐藏源文本，只展示 `<img>` widget；widget 始终块级居中显示，即使与文本同段。
3. **Markdown 双向**：markdown-it `image` token 进入 PM 后保留 source-retained 形态，PM 文档 round-trip 回 Markdown 完全一致。
4. **架构一致**：image 通过 `FeatureSpec` 注册，`parseInline` 统一裁决 (priority / consumed / crossing)，不绕过 normalize。

## Success Criteria

- [ ] 输入 `![alt](url)` 后，光标不在源范围时 DOM 中看到 `<img src="url" alt="alt">` widget，源文本被 decoration 隐藏。
- [ ] 光标移入 `![alt](url)` 任意位置 (`[openFrom, closeTo)`)，源文本全部可见且可编辑，widget 仍可见。
- [ ] url 为空时 `![alt]()`：仍被识别为合法 image source，不渲染 widget，源始终可见（无论光标位置）。
- [ ] Markdown round-trip：`setSpecMarkdown('![a](b)')` → projectEditorView 显示预期投影 → serialize 输出 `![a](b)` 完全一致。
- [ ] 破坏 source（如 backspace 删 `)`）：widget 消失，源文本变回 plain text；补齐后 widget 重新出现。
- [ ] image source 不与 link 冲突：`![x](y)` 触发 image，`[x](y)` 触发 link，`x![y](z)` 触发 image。
- [ ] alt 内的 inline markdown 不生效：`![**a**](b)` 中 `**a**` 是 alt 的 plain text，不获得 strong mark。
- [ ] `vp test` 全绿，`pnpm ready` 通过。

## Scope Boundaries

### In Scope (MVP)

- `features/image.ts`：image mark schema、markdown-it parser token、inline scan、priority/markNames/extRanges。
- image mark schema：`attrs: { src, alt, title }`。
- Widget decoration plugin (`features/image-widgets.ts`)：在源位置插入 `<img>`，url 为空时不创建。
- 源文本隐/显规则：光标在 `[openFrom, closeTo)` 内显源，外面隐源（仅当 widget 存在时）；empty url 时不隐藏。
- markdown-it `image` token handler：self-closing token → source-retained 形态。
- Spec cases (`specs/features/live-image.cases.ts`)：镜像 `live-link.cases.ts`。
- `runner.ts` `DEFAULT_TAGS.IMG` 投影 serializer。
- `.md-image-widget` 块级居中 CSS。

### Out of Scope

- 图片上传 / 远程存储 — 纯前端 markdown 编辑器，不涉及任何后端。
- alt 内嵌 inline markdown (strong/em/...) — 与 Typora 一致；alt 当 plain text。
- Reference-style 图片 `![alt][ref]` + `[ref]: url` — link 也未支持，保持一致。
- 加载失败的自定义占位 UI — MVP 交给浏览器默认 broken-img 行为。
- Figure / figcaption block node — schema 增 block node 偏离当前 mark-only inline feature 架构。

### Future Considerations

- 支持 HTML `<img>` tag 解析与 round-trip。
- 粘贴 / 拖入图片文件转 base64 或本地路径。
- 拖角缩放 / `![](url =100px)` 尺寸控制。
- Alt 编辑浮层面板。

## Execution Plan

### Dependency Graph

```
Phase 1: image feature with source-retained widget (single phase)
```

### Execution Steps

**Strategy**: Sequential（单 phase）

1. **Phase 1** — image feature with source-retained widget _(blocking, MVP)_

   ```bash
   /ideation:execute-spec docs/ideation/markdown-image/spec.md
   ```

### Agent Team Prompt

_Omitted — fully sequential single-phase project._

---

_This contract is approved and ready for execution._
