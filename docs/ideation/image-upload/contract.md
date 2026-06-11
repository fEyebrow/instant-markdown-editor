# Image Paste & Drop Upload Contract

**Created**: 2026-06-12
**Confidence Score**: 95/100
**Status**: Approved（Full scope）
**Supersedes**: None

## Problem Statement

编辑器目前只能通过手输 Markdown 文本 `![alt](url)` 插入图片，URL 必须已存在。用户截图后粘贴、或把本地图片文件拖进编辑器时没有任何处理——文件被浏览器默认行为吞掉或直接丢弃，本地图片无法进入文档。

类 Typora 的 WYSIWYG 体验要求：粘贴/拖拽图片 → 自动上传到用户自己的云存储 → 拿到 URL 后以 `![alt](url)` 进入文档。编辑器是无后端的库，上传能力必须由宿主应用注入。

## Goals

1. 粘贴剪贴板中的图片文件（截图、复制的本地文件）自动上传并在光标处插入 `![alt](url)`
2. 拖拽本地图片文件到编辑器，上传后插入到拖放坐标对应位置
3. 编辑器保持后端无关：`EditorOptions` 新增 `uploadImage?: (file: File) => Promise<string>` 回调
4. 上传期间显示占位 widget（本地 blob 预览 + 上传中样式），位置随并发编辑正确映射
5. 上传失败时占位移除、文档零残留，并通过 `onImageUploadError` 回调通知宿主

## Success Criteria

- [ ] 提供 `uploadImage` 时：粘贴 image/\* 文件 → 占位出现 → Promise resolve 后该位置出现 `![alt](url)` 文本，图片 widget 正常渲染
- [ ] 上传期间 `getMarkdown()` 输出不包含未完成的图片
- [ ] 上传期间在占位前插入/删除文本，最终 `![alt](url)` 插入位置仍正确
- [ ] Promise reject 后：占位消失，markdown 与上传前一致，`onImageUploadError(file, error)` 被调用
- [ ] 未提供 `uploadImage` 时：编辑器不拦截 paste/drop，行为与现状一致
- [ ] 一次粘贴/拖拽多个图片文件：按顺序全部上传并插入
- [ ] 非 image/\* 文件不处理，走默认行为
- [ ] alt 默认为文件名去扩展名
- [ ] `pnpm ready`（check + test + build）全量通过

## Scope Boundaries

### In Scope（MVP + Full）

- `EditorOptions` 新增 `uploadImage` / `onImageUploadError` 回调
- image-upload 插件：`handlePaste` 拦截剪贴板 image/\* 文件
- image-upload 插件：`handleDrop` 拦截拖入的 image/\* 文件，`posAtCoords` 定位
- 上传占位 widget decoration：本地 blob 预览 + 上传中样式，位置随事务映射
- 成功后在占位位置插入 `![alt](url)` 文本，复用现有 image feature 渲染
- 失败移除占位 + `onImageUploadError` 回调
- 多文件按顺序上传插入
- 拖拽时的插入位置指示（prosemirror-dropcursor）
- 粘贴同时含文本与图片文件时文件优先
- playground demo `uploadImage`（模拟延迟 + 本地 URL）
- jsdom 测试：mock File + uploadImage 驱动处理函数，断言 projection 与 markdown

### Out of Scope

- 编辑器内置具体云服务 SDK（七牛/OSS/S3）— 库保持后端无关，宿主注入
- 从其它网页拖拽图片的远程转存 — 涉及 CORS，复杂且不可靠，用户已确认排除
- 粘贴 HTML 内嵌 base64 图片的解析转存 — 用户已确认排除
- 上传进度条 / 取消上传 — `uploadImage` 契约只是 `Promise<string>`，进度需要扩展契约
- 失败占位显示错误态 + 重试按钮 — Stretch 层，未选

### Future Considerations

- 图片插入后的尺寸调整、对齐等编辑能力
- 上传进度与取消（契约扩展为带 onProgress / AbortSignal）
- 失败占位重试按钮

## Execution Plan

_Added during Phase 5 handoff. Pick up this contract cold and know exactly how to execute._

### Dependency Graph

```
Phase 1: Image upload feature（单 phase，无依赖）
```

### Execution Steps

**Strategy**: Sequential（单 phase）

1. **Phase 1** — Image upload feature

   ```bash
   /ideation:execute-spec docs/ideation/image-upload/spec.md
   ```

---

_This contract was generated from brain dump input. Review and approve before proceeding to specification._
