# Rich Text Editor

一个像 Typora 一样顺手的 Markdown 编辑器。

它让用户在写 Markdown 时不用反复切换“源码”和“预览”：输入标题、列表、
引用、链接、加粗、高亮等内容时，页面会直接呈现出接近最终文档的样子；需要修改
Markdown 符号时，也可以像编辑普通文字一样调整。

它适合用在笔记、文档、知识库、写作工具、CMS 后台等需要 Markdown 写作体验的
产品里。使用者看到的是一个干净的富文本编辑界面，仍然可以得到标准 Markdown
内容用于保存、同步或发布。

当前支持的常见写作能力包括：

- 标题、引用、分割线、编号列表和无序列表；
- 加粗、斜体、删除线、高亮、上标、下标和行内代码；
- 链接、自动链接和图片；

## 使用 `packages/editor`

编辑器包名是 `instant-markdown-editor`。

```ts
import { createEditor } from "instant-markdown-editor";
import "instant-markdown-editor/style.css";

const editor = createEditor({
  mount: document.querySelector("#editor")!,
  initialMarkdown: "# Hello",
  onChange(markdown) {
    console.log(markdown);
  },
});

console.log(editor.getMarkdown());

editor.setMarkdown("## Updated");
editor.destroy();
```

`createEditor` 接收：

- `mount` - 编辑器挂载节点；
- `initialMarkdown` - 初始 Markdown 内容；
- `onChange` - 文档变化后的 Markdown 回调；
- `cursorProjection` - 是否启用测试用 cursor projection；
- `scrollToSelection` - 是否让 ProseMirror 自动滚动到选区。

返回的 editor handle 包含：

- `view` - ProseMirror `EditorView`；
- `getMarkdown()` - 获取当前 Markdown；
- `setMarkdown(markdown)` - 用 Markdown 替换当前文档；
- `destroy()` - 销毁编辑器。

测试和 playground 使用的 spec helpers 从 `instant-markdown-editor/specs`
导出；正常业务集成只需要使用主入口和样式文件。

## 开发

仓库是 pnpm workspace：

- `packages/editor` - 编辑器本体；
- `apps/playground` - 手动验证用 Vite playground；
- `docs` - 架构说明、ADR 和项目辅助文档。

环境要求：

- Node `>=22.12.0`
- pnpm `11.1.1`

常用命令：

```bash
pnpm install
pnpm dev      # 启动 playground
vp test       # 运行 editor behavior specs
vp check      # 类型检查和 lint
pnpm ready    # check + test + build
```

开发 Markdown inline feature 时，请先阅读
`docs/inline-mark-feature-guide.md`。项目的领域词汇见 `CONTEXT.md`，架构决策见
`docs/adr`。
