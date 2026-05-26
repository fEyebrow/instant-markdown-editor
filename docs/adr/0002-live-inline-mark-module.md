# Live inline mark 抽成统一深模块

Live inline mark 的 source detection、Source projection、Inline commit、Re-enter、priority 和组合规则统一收敛到一个深模块中。各具体 mark 只声明 delimiter、mark name、样式和优先级，不再各自维护边界行为。

## 决策

### Source projection 是真实可编辑 source

当 hidden delimiter 重新显示时，用户进入 Source projection：Markdown delimiter 作为真实可编辑字符写入 ProseMirror doc，内容仍按对应 Inline mark 样式显示。

进入或离开 Source projection 本身不是用户内容变更，不进入用户历史，也不触发对外内容变更通知。Source projection 内的输入、删除和替换是用户内容变更，应进入用户历史。由这些用户动作触发的自动 Inline commit 不单独进入历史。

### Source projection 逐层展开

组合 Live inline mark 不一次性展开整个 source。光标先触达外层 mark 时只展开外层 Source projection；继续移动触达内层 committed Live inline mark 边界时，内层再展开。

当光标位于外层 Source projection 内、但相邻内层 Live inline mark 仍处于 committed 状态时，输入普通字符归属外层 source layer，不自动继承内层 committed mark。

### Inline commit boundary 统一处理

当一个 Live inline mark 处于 Source projection 且 source 已完整、非空时：

- 输入非当前 closing delimiter 的普通字符：先 Inline commit 当前 source layer，再把该字符插入到当前 source layer 外侧；若当前 source layer 位于外层 Source projection 内，该字符仍留在外层 source layer 上下文中。
- 输入当前 closing delimiter 字符：不提前 commit，继续交给 Inline mark 解析。
- 光标移出当前 source layer：Inline commit 当前 source layer。
- 光标进入内层 committed Live inline mark 边界：只展开内层 Source projection，不提交外层 source layer。

### Re-enter 由 selection 驱动

Re-enter 不绑定到某个 keymap。方向键、鼠标点击、Shift 选区和程序化 selection 都应根据 selection 所在位置触发相同的逐层 Source projection 语义。

### Resolver 统一处理冲突和组合

Live inline mark module 内部需要统一的 inline source resolver。resolver 负责识别 source ranges、处理 delimiter priority、Delimiter fallback、Crossing inline mark 和嵌套组合。

同 family 长 delimiter 已成立时，长 delimiter 优先：`**1**` 是 strong，`~~1~~` 是 strikethrough。长 delimiter 无法形成完整非空 source 时，允许短 delimiter fallback：`**1*` 可形成 italic，`~~1~` 可形成 subscript。

不同 delimiter family 的嵌套组合允许同时生效。Crossing inline mark 只保留优先级更高的 Live inline mark，另一个保持普通文本。

### Priority 规则

Inline mark priority 用于解决 Crossing inline mark 和同位置 delimiter 竞争：

1. inline code
2. strong / strikethrough
3. highlight
4. italic / subscript / superscript

优先级相同时，source 更长者优先；仍相同时，起点更靠左者优先；仍相同时，按 registry 顺序稳定排序。

### Inline code 是隔离区

inline code 自身属于 Live inline mark，参与逐层 Source projection、Inline commit 和 Re-enter。但 inline code 内容是 Inline mark 解析隔离区：内容保持 literal，不解析 italic、strong、strikethrough、highlight、subscript 或 superscript；外部 Live inline mark 也不能使用 inline code 内的 delimiter 作为 closing delimiter。

### 对外 Markdown 不暴露 projection 状态

Source projection 和 committed mark 表示同一 Markdown 语义时，serialization 必须输出相同 Markdown。移动光标进入或离开 Live inline mark 不应让 `getMarkdown()` 的结果变化。

纯 projection transaction 对外部观察者不可见：不触发 `onChange`、autosave 或未来远程同步。Source projection 内的选区替换、输入或删除按普通 Markdown source 编辑，是用户内容变更。

组合 mark serialization 按稳定顺序输出，避免相同语义在多种 Markdown source 之间抖动。初始规则按 registry / priority 的稳定顺序选择外层 mark。

现有 Markdown parse / serialize round trip 是硬约束。重构后，已有 italic、strong、inline code、strikethrough、highlight、subscript 和 superscript 的 Markdown 语义不能回退或漂移。

### 一次迁移现有 Live inline mark

italic、strong、inline code、strikethrough、highlight、subscript 和 superscript 都迁到同一个 `createLiveInlineMarkFeature(spec)` 风格接口。具体 feature 文件只保留声明式 spec 和必要的 Markdown parse / serialize 声明，不继续暴露 per-mark keymap、plugin helper 或边界补丁。

迁移分两步推进：先做等价迁移，把现有 Live inline mark 行为搬到新 module；再逐步打开新语义，包括 selection-driven Re-enter、逐层 Source projection、Delimiter fallback、Crossing inline mark priority 和组合 mark 行为。

## 原因

现有实现把 Live inline mark 行为分散在 per-mark regex、decoration widget、keymap 和局部补丁中。delimiter 有时是真实 doc 字符，有时是 widget；这让多字符 delimiter、输入继承、Backspace、鼠标点击、选区、组合 mark 和冲突规则不断产生边界 bug。

把 Live inline mark 抽成深模块，可以把复杂性集中在一个 seam：resolver 决定当前 source 语义，controller 负责 Source projection / Inline commit / Re-enter 状态转换。具体 feature 文件只声明自己是什么 mark。

## 后果

- 当前 `liveInlineMark` 的 interface 要从若干 helper 函数升级为声明式 spec，返回 plugin、keymap 和 serialization helpers。
- Pure projection transaction 需要 editor-internal meta，避免污染 history、onChange、autosave 和外部同步。
- Specs 要从单 mark case 扩展到共享 live inline mark 行为：逐层 Re-enter、Source projection 内编辑、Delimiter fallback、priority、Crossing inline mark、inline code isolation 和组合 mark。
- 现有 mark feature 文件会被改薄；短期迁移范围较大，但换来边界行为 locality。
- 如果未来引入 collab 或远程同步，需要过滤或归并 projection transaction。
