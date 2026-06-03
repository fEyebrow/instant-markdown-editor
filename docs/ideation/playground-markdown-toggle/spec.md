# Implementation Spec: Playground Markdown Toggle

**Contract**: ./contract.md
**Estimated Effort**: S

## Technical Approach

把 playground 从 "WYSIWYG + 右侧 markdown 预览" 的双栏改成单栏 "视图模式"：默认 WYSIWYG 全宽展示；按 `Mod+/` 把 WYSIWYG DOM 隐藏，露出全宽 `<textarea>`，内容由 `editor.getMarkdown()` 同步生成；再按 `Mod+/` 时把 textarea 的内容通过 `editor.setMarkdown(...)` 应用回编辑器，再恢复 WYSIWYG。

实现以 `apps/playground/src/main.ts` 为单一入口，新增一个 `view` 状态机（`"wysiwyg" | "source"`）。`Mod+/` 监听在 `window` 上（容器级），无论焦点在 ProseMirror 还是 textarea 都能触发，事件 `preventDefault` 避免被吞掉/触发浏览器默认行为。光标/滚动位置映射：进入源码时用 `view.state.selection.from` 映射到 markdown 偏移；切回时用 textarea 的 `selectionStart` 映射回 doc 位置。映射采用 "近似" 策略——基于纯文本 offset 而非 markdown 字符级精确对齐，避免引入 source map。

`packages/editor` 不动：`getMarkdown` / `setMarkdown` 已经在 `packages/editor/src/index.ts:23,58` 暴露。默认 `initialMarkdown` 改为一份介绍 + 全 inline 段 + 每个 block 一段的展示文档。

## Feedback Strategy

**Inner-loop command**: `pnpm dev`（playground vite 服务）

**Playground**: 浏览器手工验证。`vp test` 是 spec runner，不覆盖 playground UI；`vp check` 用于类型 / lint 保护。

**Why this approach**: 改动全部在 playground 这一层，唯一可靠的反馈是 dev server 实测；spec runner / unit test 在这里属于过度工程。

## File Changes

### Modified Files

| File Path                       | Changes                                                                                                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/playground/src/main.ts`   | 重写 `renderEditor`：去掉 `.editor-grid` 与 `.side-card` 节点，单栏布局；新增 `view` 状态、textarea 节点、`Mod+/` window keydown 监听；新增 `enterSource()` / `enterWysiwyg()` 切换逻辑；替换 `initial` 常量为完整展示文档。 |
| `apps/playground/src/style.css` | 给单栏视图新增/调整若干 class（`.editor-card` 单列宽度、`.source-textarea` 全宽样式）；不再依赖 `.editor-grid` 双列布局，但保留旧 class 以免影响 specs 页面。                                                                |

### New Files

无（一切落在已有文件里）。

### Deleted Files

无。`#source` 的 `<pre><code>` DOM 直接在 `main.ts` 的模板里移除即可。

## Implementation Details

### 1. Default markdown document

**Overview**: 给 `initial` 一份能完整展示 editor 能力的 markdown，作为加载 + 切换演示素材。

**约束**：

- 只用 editor 实际支持的语法：6 个 block (atx-heading / blockquote / thematic-break / ordered-list / unordered-list — 没有 fenced code block) + 8 个 inline mark (emphasis-italic `*x*` / emphasis-bold `**x**` / strikethrough `~~x~~` / subscript `~x~` / superscript `^x^` / highlight `==x==` / inline code `` `x` `` / link `[t](u)` / autolink `<https://...>`)
- 结构：开头一个 H1 + 一段介绍 packages/editor 是什么；一个 H2 "Inline syntax" + 一段把所有 inline mark 连写在一起的示例文字；一个 H2 "Block syntax" + 每个 block 各占一段简单展示

**Implementation steps**:

1. 把 `main.ts` 顶部的 `initial` 常量替换为新文档；不再放原来的 fenced code block（editor 没实现 block code，渲染会有歧义）。
2. 在浏览器里加载 playground，确认每一个 mark / block 都被正确渲染。

**Feedback loop**:

- **Playground**: `pnpm dev`，打开浏览器
- **Experiment**: 焦点放到每段，看 WYSIWYG 是否符合预期；按 Mod+/ 切到源码再切回，doc 不应有非预期改写
- **Check command**: 无自动化；目视验证

### 2. View state + DOM 模板单栏化

**Pattern to follow**: 现有 `renderEditor` (`apps/playground/src/main.ts:30`) — 沿用 innerHTML 渲染 + querySelector 取节点的风格。

**Overview**: 把 `.editor-grid + .editor-card + .side-card` 改成单一 `.editor-card`；同时在卡片里同时挂 `#editor`（WYSIWYG mount）和 `#source`（textarea），通过 CSS 类 + display 切换。

```typescript
type ViewMode = "wysiwyg" | "source";

interface PlaygroundState {
  editor: EditorHandle;
  textarea: HTMLTextAreaElement;
  editorMount: HTMLElement;
  view: ViewMode;
}
```

**Key decisions**:

- 不卸载/重建 EditorView：用 CSS 隐藏 (`hidden` attribute / `display: none`) 即可，避免每次切换都重新挂载 ProseMirror、丢历史与插件状态。
- textarea 与 editor mount 共用 `.editor-card` 容器，方便 CSS 一致。

**Implementation steps**:

1. 模板里同时渲染 `<div id="editor"></div>` 和 `<textarea id="source" class="source-textarea" hidden></textarea>`，移除原右侧 `.side-card`。
2. `createEditor` 后保留 handle，把 textarea / editorMount / view = "wysiwyg" 存到一个本地 state object。
3. 删除原来 `source.textContent = editor.getMarkdown()` 的常驻预览逻辑（这块只在切到源码时刷新）。

**Feedback loop**:

- **Playground**: `pnpm dev`
- **Experiment**: 加载页面，确认默认看到 WYSIWYG，无右侧预览
- **Check command**: 无自动化；目视验证

### 3. Toggle via `Mod+/`

**Overview**: 全局 keydown 监听，捕获 `Mod+/` 时切换视图。

```typescript
function isToggleChord(e: KeyboardEvent): boolean {
  if (e.key !== "/") return false;
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  return isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
}

function enterSource(s: PlaygroundState): void {
  s.textarea.value = s.editor.getMarkdown();
  s.editorMount.hidden = true;
  s.textarea.hidden = false;
  s.textarea.focus();
  // 光标 / 滚动映射见组件 4
  s.view = "source";
}

function enterWysiwyg(s: PlaygroundState): void {
  s.editor.setMarkdown(s.textarea.value);
  s.textarea.hidden = true;
  s.editorMount.hidden = false;
  s.editor.view.focus();
  s.view = "wysiwyg";
}
```

**Key decisions**:

- 在 `window` 上而不是在 ProseMirror keymap 里挂监听：textarea 焦点下 ProseMirror keymap 收不到事件；window 级别两种焦点都覆盖。
- `e.preventDefault()` + `e.stopPropagation()`：避免被 ProseMirror 或浏览器吸收。`/` 在某些浏览器是 quick find 触发键，必须吞掉。
- 用 navigator.platform 判 Mac/非 Mac，保持和 ProseMirror "Mod-" 的语义一致。
- 切回时无脑 `setMarkdown(textarea.value)`，不做 diff；即使 textarea 没改也无害（doc 结构等价重建）。

**Implementation steps**:

1. 在 `renderEditor` 末尾 `window.addEventListener("keydown", handler)`；handler 闭包持有 state。
2. handler 中：检 `isToggleChord` → preventDefault → 根据 `state.view` 调 `enterSource` / `enterWysiwyg`。
3. 不需要 cleanup（playground 全生命周期都挂着）；如果未来要做 SPA 路由再补 removeEventListener。

**Feedback loop**:

- **Playground**: `pnpm dev`
- **Experiment**: WYSIWYG focus → Mod+/ → 应进入源码模式；textarea focus → Mod+/ → 应回到 WYSIWYG；source 里手改内容 → Mod+/ → WYSIWYG 应反映修改
- **Check command**: 无自动化；目视验证

### 4. 光标 / 滚动位置映射

**Overview**: 切换时尽量保留用户当前位置，避免 Mod+/ 把光标甩飞。映射采用近似策略。

**Key decisions**:

- 进入源码：取 `view.state.doc.textBetween(0, view.state.selection.from, "\n")` 的长度作为 textarea 的 selectionStart / End；不做 markdown delimiter 偏移补偿，因为对用户体感"差不多就行"。
- 切回 WYSIWYG：`setMarkdown` 之后用 `textarea.selectionStart` 当作"想要的纯文本 offset"，遍历新 doc 节点累加 textContent 长度找到首次 ≥ offset 的位置，dispatch 一个 setSelection 事务。
- 滚动位置：source 进入时把 `editorMount` 的 scrollTop 暂存到 state；切回时还原。textarea 自身的 scrollTop 同样在切走时暂存。
- 不要求像素级精确，只要 "切回时光标大致还在我刚才编辑的地方"。

**Implementation steps**:

1. 在 state 上加 `lastEditorScrollTop?: number` / `lastSourceScrollTop?: number`。
2. `enterSource` 中：算 textPos → 设置 textarea selection，把 `editorMount.scrollTop` 存进 state，恢复 `textarea.scrollTop`。
3. `enterWysiwyg` 中：算 textPos → 用 doc 遍历转 doc pos → `view.dispatch(view.state.tr.setSelection(TextSelection.near(...)))`，恢复 `editorMount.scrollTop`，存 `textarea.scrollTop`。

**Feedback loop**:

- **Playground**: `pnpm dev`
- **Experiment**: 在 WYSIWYG block syntax 区域点一下光标 → Mod+/ → textarea 选区应大致在同段；在 textarea 末尾输入字符 → Mod+/ → WYSIWYG 光标应靠近末尾
- **Check command**: 无自动化；目视验证

## Testing Requirements

### Automated

无新增自动化测试。playground 不属于 specs 覆盖范围。

### Manual

- [ ] `pnpm dev` 启动，根路径加载后，编辑器全宽显示，无右侧 markdown 预览栏
- [ ] 默认文档的 inline 段能看到 italic / bold / strikethrough / sub / sup / highlight / inline-code / link / autolink 的渲染
- [ ] 默认文档的 block 段能看到 H1 / H2 / blockquote / thematic break / ordered list / unordered list
- [ ] WYSIWYG focus → Cmd+/ → 切换到 textarea，内容 = 当前 markdown，textarea 获得焦点
- [ ] textarea 中改一行（例如把 `**bold**` 改成 `**BOLD**`）→ Cmd+/ → 回到 WYSIWYG，对应文字变化
- [ ] textarea focus 时 Cmd+/ 不触发浏览器默认行为（不打开 find / 不输入 `/`）
- [ ] 在长文档下，切到源码、再切回，光标大致还在原位置；滚动不会跳到顶部
- [ ] specs 页面（`/specs`）仍能正常加载（这次改动不应影响 spec runner UI）

## Failure Modes

| Component        | Failure Mode                                                                                       | Trigger                                           | Impact                                    | Mitigation                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Toggle keydown   | `/` 被浏览器/ProseMirror 吞掉，切换失效                                                            | textarea 焦点 + Firefox quick-find；某些 IME 状态 | Mod+/ 没反应                              | 在 window capture 阶段挂监听，`preventDefault + stopPropagation`，并对 `e.isComposing` 提前 return |
| setMarkdown 回写 | textarea 里写了 editor parser 不识别的 markdown（如未支持的 fenced code block）                    | 用户在 source 模式里手写 ``` 等                   | doc 解析后丢失这块内容 / 退化成 paragraph | 不修复；contract 已声明这是 playground，用户应只输入支持的语法                                     |
| 光标映射         | doc 中含较多 delimiter（highlight / sub / sup）导致 textBetween offset 与 markdown offset 偏差较大 | 大量 inline mark 的段落                           | 切换后光标偏几个字符                      | 接受偏差；只保证大致位置                                                                           |
| View 隐藏        | hidden 属性被 CSS `display: block` 覆盖                                                            | 旧 style.css 残留                                 | 切换时两者同时可见                        | 用 `hidden` HTML 属性 + 显式 `[hidden] { display: none }` CSS fallback                             |

## Validation Commands

```bash
# 类型 + lint
vp check

# spec 测试 (不覆盖 playground UI，但要确认没引入 import 影响)
vp test

# dev server (主反馈)
pnpm dev
```

## Open Items

无。

---

_可以开始实现。所有验证都在 `pnpm dev` 浏览器里完成。_
