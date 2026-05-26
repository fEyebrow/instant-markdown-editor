# Rich Text Editor

类 Typora 的 Markdown 编辑器，本文档描述编辑过程中 Markdown 源文本的表示方式。

## 术语

**Inline mark（行内标记）**：
用 Markdown delimiter 包裹、作用于块内文本的行内样式。
_避免_：inline feature、inline style

**Live inline mark（实时行内标记）**：
一种 **Inline mark**，在 commit 前同时显示其 Markdown delimiter 并把内容渲染为带样式的文本。范围内实例：italic、strong、inline code、strikethrough。
_避免_：realtime mark、live display

**Block trigger（块触发器）**：
位于行首的一种 Markdown 模式，被识别时把所在段落变换为另一个块级节点。变换时机随 trigger 不同：

- **Heading trigger**（`#{1,6} ` + 非空内容）：段落保持，`#` 显示为 **Block pending marker**，Enter 或光标离开行时 **Commit**，段落被替换为 heading 节点。
- **输入即变 trigger**（`> `、`- ` / `* ` / `+ `、`1. `）：模式输入完整的那一刻立刻把段落替换为目标节点，无 pending 阶段，无独立 commit 步骤。
- **内容检查 trigger**（`---`）：段落保持纯文本，Enter 或光标离开行时检查行内容是否恰为 `---`，匹配则替换为 thematic break 节点；无 pending marker。
  范围内实例：ATX heading、unordered list、ordered list、blockquote、thematic break。
  _避免_：block syntax、block prefix、live block mark

**Pending marker（待定标记）**：
在 **Commit** 之前可见的 Markdown delimiter。两种变体：

- **Inline pending marker** — 属于 **Live inline mark**。mark 的内容已经渲染为带样式的文本；commit 之后光标重新进入该 mark 范围时，pending marker 会重新出现。
- **Block pending marker** — 仅 ATX heading 在内容非空时使用，`#` 字符以灰色显示；commit 后 trigger 字符被消耗，pending 不再出现。其他 block trigger 无 pending 阶段。
  _避免_：syntax marker、hidden marker

**Source projection（源文本投影）**：
一种 **Live inline mark** 的编辑状态：Markdown delimiter 以真实可编辑字符出现，内容同时按对应 **Inline mark** 样式显示。光标进入已 commit 的 **Live inline mark** 并重新显示 **Inline pending marker** 时，即进入 **Source projection**。
组合 **Live inline mark** 逐层进入 **Source projection**：光标先触达外层 mark 时只展开外层 source；继续移动触达内层 mark 边界时，内层 mark 再展开 source。
当光标位于外层 **Source projection** 内、但相邻内层 **Live inline mark** 仍处于 committed 状态时，输入普通字符归属外层 source layer，不自动继承内层 committed mark。
**Source projection** 中的 Markdown delimiter 是真实可编辑字符；在 **Source projection** 内选区替换、输入或删除都按普通 Markdown source 编辑。进入或离开 **Source projection** 本身不代表用户内容变更，只有在 **Source projection** 内的输入、删除或替换才是用户内容变更。
_避免_：fake source、widget source、visual source

**Delimiter fallback（分隔符降级匹配）**：
当同一 delimiter family 的长 delimiter 规则无法形成完整非空 **Live inline mark** source 时，允许短 delimiter 规则使用其中的字符形成 **Live inline mark**。例如 `**1*` 中 strong 不成立，但第二个 `*` 与 closing `*` 可形成 italic；`~~1~` 中 strikethrough 不成立，但第二个 `~` 与 closing `~` 可形成 subscript。若长 delimiter 规则已经成立，则不进行降级匹配：`**1**` 是 strong，`~~1~~` 是 strikethrough。
只有 resolver 识别出的 source range 显示 **Inline pending marker** 和 live 样式；未被识别的字符保持普通文本，例如 `==1=` 完全保持普通文本。
_避免_：partial parse、loose match

**Crossing inline mark（交叉行内标记）**：
两个 **Live inline mark** source ranges 互相交叉但不形成包含关系，例如 `*==1*==`。交叉时只保留优先级更高的 **Live inline mark**，另一个保持普通文本。嵌套组合不属于交叉，允许多个 **Inline mark** 同时作用于内容。
_避免_：overlap style、mixed nesting

**Inline mark priority（行内标记优先级）**：
用于解决 **Crossing inline mark** 和同位置 delimiter 竞争。inline code 最高；长 delimiter 高于同 family 短 delimiter；当前优先级从高到低为 inline code、strong / strikethrough、highlight、italic / subscript / superscript。优先级相同时，source 更长者优先；仍相同时，起点更靠左者优先；仍相同时，按 registry 顺序稳定排序。
_避免_：style importance、visual priority

**Inline code isolation（行内代码隔离）**：
inline code 的内容是 **Inline mark** 解析隔离区。inline code 内的字符保持 literal，不解析 italic、strong、strikethrough、highlight、subscript 或 superscript；外部 **Live inline mark** 也不能使用 inline code 内的 delimiter 作为 closing delimiter。
inline code 自身仍是 **Live inline mark**，参与逐层 **Source projection**、**Inline commit** 和 re-enter 行为；隔离只作用于 inline code 内容内部的其他 **Inline mark** 解析。
_避免_：code priority、code nesting rule

**Inline commit boundary（行内提交边界）**：
当一个 **Live inline mark** 处于 **Source projection** 且 source 已完整、非空时，输入非当前 closing delimiter 的普通字符会先 **Inline commit** 当前 source layer，再把该字符插入到当前 source layer 外侧；若当前 source layer 位于外层 **Source projection** 内，该字符仍留在外层 source layer 的上下文中。输入当前 closing delimiter 字符不会提前 commit，而是继续交给 **Inline mark** 解析。光标移出当前 source layer 时，当前 source layer **Inline commit**；光标进入内层 committed **Live inline mark** 边界时，只展开内层 **Source projection**，不提交外层 source layer。
_避免_：space rule、typing boundary

**Re-enter（重新进入）**：
光标或选区进入已 committed 的 **Live inline mark** 边界或内部时，该 mark 按逐层规则进入 **Source projection**。**Re-enter** 由 selection 所在位置驱动，不限于特定键盘事件；方向键、鼠标点击、Shift 选区和程序化 selection 都应遵循同一语义。
_避免_：arrow reopen、cursor hack

**Commit（提交）**：
**Live inline mark**、Heading trigger 或 Thematic break trigger 完成最终化的状态转换。行为有别：

- **Inline commit** — 由输入闭合 delimiter（或尾随空格）触发。隐藏 inline pending marker；光标重新进入时可逆复现。
- **Heading commit** — 由 Enter 或光标离开该行（ArrowDown / ArrowUp / 点击其他块）触发。段落被替换为 heading 节点；`#` 字符被消耗并从文档中移除。不可逆。
- **Thematic break commit** — 由 Enter 或光标离开该行触发，且行内容恰为 `---` 时段落被替换为 `<hr>` 节点。不可逆。
- 输入即变 trigger（blockquote、list）无独立 commit 步骤，模式输入完成即同时完成转换。

## 关系

- 一个 **Live inline mark** 在 commit 之前包含零或多个 **Inline pending marker**。
- 一个 **Live inline mark** 在 commit 前后都会把内容渲染为带样式的文本。
- 已 commit 的 **Live inline mark** 隐藏其 **Inline pending marker**；光标重新进入 mark 范围时它们会重新出现。
- ATX heading 在 `#{1,6} ` 后内容非空时显示 **Block pending marker**；commit 后段落被替换为 heading 节点，`#` 被消耗，pending 不再出现。
- 其他 **Block trigger** 在模式完整时立刻把段落替换为目标节点，无 pending 阶段。

## 示例对话

> **Dev：** "`**text**` 在第二个 `**` 敲下时就应该立刻变粗体吗？"
> **领域专家：** "是的 — 它依然是一个带 **Inline pending marker** 的 **Live inline mark**，但 `text` 在 commit 之前就已经是粗体了。"

> **Dev：** "`# ` 后还没打字，`#` 是 pending 吗？"
> **领域专家：** "不是 — `# ` 后必须开始打内容，`#` 才变灰成为 **Block pending marker**。`# |` 单独存在时 `#` 是普通字符。"

> **Dev：** "`> quote` 也是同样的 pending 模型吗？"
> **领域专家：** "不是 — blockquote 是输入即变。`> ` 输入完那一刻段落立刻替换为 `<blockquote>`，无 pending 阶段。"

## 暂存歧义

- Highlight `==` 与 inline / block math 仍属于范围外，等成为领域术语再纳入。
- Fenced code block 已从 phase 1 移除，留待后续 phase 再设计触发模型。
