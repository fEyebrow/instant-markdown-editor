# Phase 2 Scope

Phase 2 在 phase 1 的 live inline mark 和基础块结构之上，继续定义更丰富的 Markdown 对象。本文档只记录已经对齐的用户可见行为，暂不讨论实现。

## 术语

**Source projection（源文本投影）**：
编辑器识别出某段 Markdown 结构后呈现的可编辑源文本状态。它保留 Markdown delimiter 和内容文本，但会用样式表达结构语义。Source projection 不是普通文本，因为结构已经被识别；也不是 rendered view，因为 Markdown 源字符仍可直接编辑。

示例：

- Link source projection 保留 `[text](url)`，弱化 delimiter，并允许直接编辑 `text` 和 `url`。
- Autolink source projection 保留 `<url>`，弱化 angle delimiter，并把 URL 显示为 link target 样式。
- Image source projection 保留 `![alt](src)`，在 `!` 前显示图片状态 logo，并可能在 source 行下方显示图片预览。

**Rendered view（渲染视图）**：
已提交 Markdown 结构的折叠显示状态。Markdown delimiter 被隐藏。当光标进入该结构，或用户点击已渲染对象时，rendered view 可以重新展开为 source projection。

示例：

- `[text](url)` 在 rendered view 中显示为链接文本。
- `![alt](src)` 在 rendered view 中显示为加载成功的图片。

## 范围内

### Inline Link

#### 识别

完整的 inline link 结构一律进入 source projection：

```markdown
[text](url)
[text]()
[](url)
[]()
```

label 或 URL 可以为空。不完整结构保持普通文本：

```markdown
[text](url
[text](
[text]
```

从普通文本输入 link 时，不提前弱化 delimiter。编辑器等到最后一个 `)` 让结构完整后，才进入 source projection。

#### Source Projection

在 source projection 中：

- `[`、`](`、`)` 使用 delimiter 样式。
- label 文本可编辑。
- URL 文本可编辑。
- 如果编辑破坏了完整结构，整段退回普通文本。
- 如果继续编辑让结构重新完整，再次进入 source projection。

#### Commit

当 label 非空时：

- 按 Space commit 到 rendered view，并插入一个普通尾随空格。
- 光标移出 source projection 时 commit 到 rendered view，但不插入空格。

URL 可以为空。因此 `[text]()` 可以 commit 为 href 为空的 rendered link。

当 label 为空时：

- Space 不 commit。
- 光标移走也不 commit。
- 结构保持 source projection。

#### Re-Enter

当光标进入已 commit 的 rendered link 任意位置时，link 重新展开为 source projection。

示例：

```markdown
[|text](url)
[te|xt](url)
[text|](url)
```

空 URL 的 rendered link 也重新展开为：

```markdown
[text]()
```

### Autolink

Phase 2 覆盖 angle autolink：

```markdown
<https://example.com>
<http://example.com>
```

#### 识别与预览

完整的 `<valid-url>` 进入 source projection：

```markdown
<https://example.com>
```

在 source projection 中：

- `<` 和 `>` 使用 delimiter 样式。
- URL 使用 link target 样式。

空 autolink 不进入 source projection，也不 commit：

```markdown
<>
```

Autolink 和 inline link 的输入过程不同：只要当前内容可以识别为 valid URL，即使还没有 closing `>`，URL 部分也可以显示 link 样式。

示例：

```markdown
<http://e|
<https://example.com|
```

在这些状态中：

- 除非完整 source projection 已经成立，否则 `<` 不使用 delimiter 样式。
- 只要 URL 仍能识别为 valid URL，URL 部分保持 link 样式。

如果 URL 部分已经无法识别为 valid URL，整段显示为普通文本：

```markdown
<https://|
```

#### Commit

当 URL valid 且非空时：

- 按 Space commit 为 rendered link，并插入一个普通尾随空格。
- 光标移出 source projection 时 commit 为 rendered link，但不插入空格。

Rendered link 的文本和 href 都是该 URL。

#### Re-Enter

当光标进入已 commit 的 rendered autolink 任意位置时，它重新展开为 angle source projection：

```markdown
<https://exa|mple.com>
```

#### 结构失效

如果完整 autolink source projection 被编辑到删除 closing `>`：

```markdown
<https://example.com|
```

`<` 的 delimiter 样式失效。URL 部分只有在仍然 valid 时继续保持 link 样式。

### Image

Phase 2 覆盖 inline image Markdown：

```markdown
![alt](src)
```

#### 识别

任何完整 image 结构都进入 image source projection：

```markdown
![alt](src)
![alt]()
![](src)
![]()
```

不完整结构保持普通文本。如果 image source projection 被编辑成不完整结构，它退回普通文本，并停止显示图片 logo 或预览。

#### Source Projection

Image source projection 由 source 行和图片状态组成：

```markdown
[image-state-logo] ![alt](src)
```

source 文本仍可编辑。图片状态 logo 显示在 `!` 前。

#### 图片加载状态

图片加载状态完全按浏览器图片加载结果判断：

- `img load` 表示成功。
- `img error` 表示失败。

可见状态为：

- `src` 为空：显示普通 image logo，不显示预览。
- `src` 非空且加载中：显示 loading image logo，在 source 行下方显示 loading 状态。
- `src` 非空且加载成功：显示普通 image logo，在 source 行下方显示图片预览。
- `src` 非空且加载失败：显示 broken image logo，不显示预览。

#### 预览

当显示图片预览时：

- 预览宽度等于编辑器内容宽度。
- 高度按图片比例自适应。
- 不裁剪。
- 预览不可被选择。
- 光标不会停在预览图片后方。

#### 离开 Source Projection

如果 `src` 非空且图片加载成功，光标移出 source projection 后，image 折叠为 rendered view：

- 只显示图片。
- source 行隐藏。
- alt 文本不在 rendered view 中显示。

如果 `src` 为空、加载中或加载失败，光标离开后仍保持 source projection。

#### Re-Enter

点击 rendered image，或通过键盘移动到 rendered image，都会把它重新展开为 source projection。

默认光标位置在 alt 文本末尾：

```markdown
![alt|](src)
```

如果 alt 为空：

```markdown
![|](src)
```

#### 复制

复制 rendered image 时，复制它的 Markdown 源文本：

```markdown
![alt](src)
```

### Task List

Task list 行为以 Typora 为参照。Task list 不是独立的行首 block trigger，而是 unordered list item 内部的 task marker trigger。

#### 识别

用户先通过已有的 unordered list trigger 创建普通 list item：

```markdown
-

*

-
```

当 unordered list item 的内容起始位置输入完整 task marker 时，当前 item 转换为 task list item：

```markdown
[ ]
[x]
[X]
```

转换规则：

- `[ ] ` 转换为 unchecked task item。
- `[x] ` 和 `[X] ` 转换为 checked task item。
- task marker 被消耗，不保留 source projection。
- 普通 paragraph 中输入 `[ ] ` / `[x] ` / `[X] ` 不触发 task list。
- list item 内容中间输入 `[ ] ` / `[x] ` / `[X] ` 不触发 task list。

因此，完整输入路径是两段式：

```markdown
-
- [ ]
```

第一步先得到普通 unordered list item，第二步再转换为 task list item。

#### 显示

Task item 在编辑视图中显示为 checkbox + item 内容：

- unchecked task item 显示空 checkbox。
- checked task item 显示已勾选 checkbox。
- Markdown 源字符 `- [ ] ` / `- [x] ` 在编辑视图中隐藏。
- checked task item 的正文不自动添加删除线，也不自动变灰。

#### Toggle

点击 checkbox 切换 checked / unchecked 状态。

切换 checkbox：

- 只改变 task item 的 checked 状态。
- 不改变 item 正文。
- 不把 checked 状态应用到其他 item。

#### Enter

在非空 task item 末尾按 Enter，创建同级 task item。

新 task item 默认 unchecked，即使上一项是 checked。

在空 task item 上按 Enter，退出 task list，创建普通 paragraph。

#### Tab / Shift-Tab

Task item 沿用 unordered list 的 Tab / Shift-Tab 行为：

- Tab sink 当前 item。
- Shift-Tab lift 当前 item。
- checked / unchecked 状态跟随 item 移动。

嵌套 task list 序列化为标准 Markdown 缩进：

```markdown
- [ ] parent
  - [x] child
```

#### 复制与序列化

复制或序列化 task list 时，输出 Markdown task list：

```markdown
- [ ] todo
- [x] done
```

`[X]` 输入会被识别为 checked task item；输出时统一序列化为 `[x]`。

### Live Inline Mark Commit Boundary

Phase 2 统一 live inline mark 的 commit 边界规则。适用对象包括 phase 1 已有的 italic、strong、inline code、strikethrough，以及 phase 2 新增的 highlight、subscript、superscript。

当一个 live inline mark 已经形成完整结构后：

- 输入 Space：commit 当前 mark，并插入一个普通尾随空格。
- 输入非当前 closing delimiter 的字符：先 commit 当前 mark，再把该字符作为 mark 后方的普通文本插入。
- 输入当前 delimiter 字符：暂不 commit，继续交给 inline mark 解析判断。
- 光标移出 mark 范围：commit 当前 mark，但不插入额外字符。

示例：

```markdown
*1*2
```

结果语义是 `1` 为 italic，`2` 为普通文本。

```markdown
==a==b
```

结果语义是 `a` 为 highlight，`b` 为普通文本。

### Highlight

Highlight 使用 `==` delimiter：

```markdown
==text==
```

#### 识别

完整且内容非空的 `==text==` 识别为 highlight live inline mark。

- 单个 `=` 是普通文本。
- 空内容 `====` 不识别。
- 不允许跨行。
- 可以和其他 inline mark 组合。
- Inline code 内不解析 highlight。

#### 显示与 Commit

在 commit 前：

- 两侧 `==` 是 inline pending marker。
- 内容立即显示为高亮样式。

commit 后：

- `==` 隐藏。
- 内容保持高亮样式。
- 光标重新进入 highlight 范围时，`==` 重新显示。

Highlight 沿用 live inline mark commit boundary。

### Subscript

Subscript 使用单个 `~` delimiter：

```markdown
H~2~O
```

#### 识别

完整且内容非空的 `~text~` 识别为 subscript live inline mark。

- 单个 `~` 是普通文本，除非形成完整 subscript。
- `~~text~~` 优先识别为 strikethrough，不识别为 subscript。
- 内容 trim 后为空时不识别。
- 不允许跨行。
- 可以和其他 inline mark 组合。
- Inline code 内不解析 subscript。

#### 显示与 Commit

在 commit 前：

- 两侧 `~` 是 inline pending marker。
- 内容立即显示为下标样式。

commit 后：

- `~` 隐藏。
- 内容保持下标样式。
- 光标重新进入 subscript 范围时，`~` 重新显示。

Subscript 沿用 live inline mark commit boundary。

### Superscript

Superscript 使用 `^` delimiter：

```markdown
x^2^
```

#### 识别

完整且内容非空的 `^text^` 识别为 superscript live inline mark。

- 单个 `^` 是普通文本，除非形成完整 superscript。
- 内容 trim 后为空时不识别。
- 不允许跨行。
- 可以和其他 inline mark 组合。
- Inline code 内不解析 superscript。

#### 显示与 Commit

在 commit 前：

- 两侧 `^` 是 inline pending marker。
- 内容立即显示为上标样式。

commit 后：

- `^` 隐藏。
- 内容保持上标样式。
- 光标重新进入 superscript 范围时，`^` 重新显示。

Superscript 沿用 live inline mark commit boundary。

### Emoji Shortcodes

Emoji shortcode 使用 `:name:` 形式，并带有候选浮层和 rendered emoji 状态。

#### 候选浮层

输入 `:` 后不立即显示候选。只有当 `:` 后至少输入一个字符时，显示 emoji 候选浮层：

```markdown
:b
:bo
```

候选浮层：

- 悬浮显示，不占文档布局空间。
- 根据当前输入过滤候选。
- 每项显示 emoji 图标和 shortcode。
- ArrowUp / ArrowDown 移动高亮项。
- Enter / Tab 选择当前项。
- 鼠标点击候选项也可以选择。

选择候选后，直接 commit 成 rendered emoji。

#### 手动输入完整 Shortcode

如果用户手动输入完整且已知的 shortcode：

```markdown
:book:
```

它进入 emoji source projection：

- 保留 `:book:` 源文本。
- `:book:` 前显示对应 emoji。
- 如果继续输入普通字符，先 commit 为 rendered emoji，再插入该普通字符。

示例：

```markdown
:book:a
```

结果语义是 rendered emoji `:book:` 后跟普通文本 `a`。

未知 shortcode 保持普通文本，不进入 source projection：

```markdown
:not_real:
```

#### Rendered View 与 Re-Enter

commit 后，emoji 显示为 rendered emoji，隐藏 shortcode 源文本。

当光标进入 rendered emoji 时，它重新展开为 emoji source projection：

```markdown
[emoji] :book:
```

#### 复制与序列化

复制 rendered emoji 时，复制 Markdown 源语义：

```markdown
:book:
```

## 待后续讨论

- Fenced code blocks
- Tables
- Inline and block math
- Footnotes
- YAML front matter
- `[TOC]`
- Mermaid
- Paste-URL-to-link convenience behavior
- Drag-in images and upload/storage flows
