# Playground Markdown Toggle Contract

**Created**: 2026-06-03
**Confidence Score**: 96/100
**Status**: Approved
**Supersedes**: None

## Problem Statement

playground 目前是 "左 WYSIWYG + 右只读 markdown 预览" 的双栏布局：能看 markdown 输出，但不能直接编辑源文本；同时默认文档过于简短（仅几个示例 + 一个 editor 不支持的 fenced code block），不足以演示 packages/editor 目前支持的全部 markdown 语法。

希望把 playground 改成单栏：默认 WYSIWYG 全宽；按 Cmd+/ (`Mod+/`) 切换到一个可编辑的 markdown 纯文本视图，再按 Cmd+/ 切回 WYSIWYG，textarea 中的修改通过已有的 `editor.setMarkdown()` 同步回富文本编辑器。同时换一份能够覆盖所有 inline 与 block 语法的默认文档，让 playground 同时承担 "使用入口" 和 "功能展示" 两个角色。

`packages/editor` 已经在 `EditorHandle` 上暴露了 `getMarkdown()` / `setMarkdown()`，因此本期不需要在 editor 包加新接口。

## Goals

1. playground 单栏化：默认 WYSIWYG 全宽显示，移除现有右侧只读 markdown 预览栏。
2. `Mod+/` 在 WYSIWYG ↔ 源码 textarea 之间切换，两种视图下都生效。
3. 进入源码模式时用 `editor.getMarkdown()` 填充 textarea；切回 WYSIWYG 时用 `editor.setMarkdown()` 应用 textarea 的修改。
4. 默认 `initialMarkdown` 包含：一段介绍 packages/editor 是什么；一段把全部 inline 语法连写一起的展示文本；每个 block 语法各一段简单展示。
5. 切换时保留光标 / 滚动位置的近似映射，避免 Mod+/ 把光标甩飞。

## Success Criteria

- [ ] 首次打开 playground，编辑器区域全宽显示新的默认文档，原右侧 markdown 预览栏不再出现。
- [ ] 默认文档在 WYSIWYG 中能看到 emphasis (italic+bold) / strikethrough / sub / sup / highlight / link / autolink / inline code 这 8 个 inline 语法效果，以及 atx-heading / blockquote / thematic-break / ordered-list / unordered-list 这 5 个 block 各被展示一次。
- [ ] WYSIWYG focus 时按 Mod+/，WYSIWYG 隐藏，textarea 出现并获得焦点，内容等于 `editor.getMarkdown()` 的结果。
- [ ] textarea focus 时按 Mod+/，textarea 隐藏，WYSIWYG 重新显示，doc 反映 textarea 的最新内容。
- [ ] Mod+/ 在两种视图下都不会触发浏览器默认行为（不打开 quick-find / 不输入 `/`）。
- [ ] 切换时光标与滚动位置维持近似位置，不会跳回顶部 / 文档开头。
- [ ] `vp check` 与 `vp test` 不应回退。

## Scope Boundaries

### In Scope

- playground 单栏布局重构（去掉右侧只读预览栏）。
- 视图状态 `"wysiwyg" | "source"`，textarea DOM，window 级 `Mod+/` 监听。
- 进入源码：`editor.getMarkdown()` → textarea；切回：`editor.setMarkdown(textarea.value)`。
- 替换默认 markdown 文档为覆盖所有支持语法的展示文档。
- 切换时近似保留光标 / 滚动位置。

### Out of Scope

- 在 packages/editor 内实现源码模式 / 暴露新 API — 现有 `getMarkdown` / `setMarkdown` 已够用。
- textarea 的 markdown 语法高亮 / 集成 CodeMirror — playground 是手工验证，不引入依赖。
- localStorage 持久化当前模式或文档内容 — playground 不需要跨刷新保留。
- 为 playground 编写 spec runner 用例 — playground 不在 `specs/` 覆盖范围内。

### Future Considerations

- 顶栏增加可点击的 "源码模式" 按钮，作为 Mod+/ 的视觉补充。
- 把源码模式上升为 packages/editor 的内置展示模式。
- playground 提供多份示例文档可切换（cheatsheet / blog post / 长文档等）。

## Execution Plan

### Dependency Graph

```
Phase 1: Playground source-mode toggle + default doc  (only phase)
```

### Execution Steps

**Strategy**: Sequential (单一 phase)

1. **Phase 1** — Playground source-mode toggle + default doc _(blocking, low risk)_

   ```bash
   /ideation:execute-spec docs/ideation/playground-markdown-toggle/spec.md
   ```

   或者直接 autopilot：

   ```bash
   /ideation:autopilot
   ```

---

_Approved 2026-06-03. 实施细节见 spec.md。_
