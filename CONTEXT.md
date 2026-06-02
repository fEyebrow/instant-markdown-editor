# Rich text editor glossary

## Inline mark language

**Source text**

Inline mark 编辑态的事实来源。用户输入的 Markdown 字符本身就是可编辑文档内容，例如 `==text==` 中的 `==` 和 `text` 都是真实 text。不要把 inline mark 的编辑态理解成一份隐藏状态或 widget 投影。

**Semantic mark**

ProseMirror document 中承载 Markdown 语义的 mark。Normalize 的目标是让 semantic marks 与当前 source text 收敛一致：source 成立则内容有 mark，source 失效则对应 mark 消失。

**Source projection**

同一 Markdown 语义的一种编辑态形态：delimiter 作为真实 source text 留在文档里，内容同时带 semantic mark。例如 `==text==` 中 `text` 带 highlight mark，两个 `==` 仍是可编辑字符。

**Committed form**

同一 Markdown 语义的另一种形态：文档只保留带 semantic mark 的内容，不显示 source delimiter。`source projection` 和 `committed form` 语义等价，Markdown serializer 应输出等价 Markdown。

**Normalize**

从当前 source text 和 `parseInline` 结果推导并同步 semantic marks 的收敛过程。Normalize 不维护独立 live mark 状态，也不解释用户刚按了什么键；删除、粘贴、撤销重做和普通输入都应从当前文档事实重新收敛。
