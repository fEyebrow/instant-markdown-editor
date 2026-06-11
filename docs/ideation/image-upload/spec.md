# Implementation Spec: Image Paste & Drop Upload

**Contract**: ./contract.md
**Estimated Effort**: M（单 phase，~6 个文件）

## Technical Approach

编辑器已有完整的 source-retained image 体系：`![alt](url)` 以真实文本保留，`image` mark 由 inline-parse/normalize 同步，`image-widgets.ts` 在闭合符后渲染 `<img>`。本功能**不引入任何新 schema node**——上传成功后只需在目标位置 `tr.insertText("![alt](url)")`，现有体系自动接管解析与渲染。

新增一个 `imageUploadPlugin`：通过 `handlePaste` / `handleDrop` props 拦截 image/\* 文件，立即在插入点放置 placeholder widget decoration（本地 blob 预览 + 上传中样式），decoration 位置随后续事务 map；`uploadImage(file)` resolve 后在 placeholder 当前映射位置插入 markdown 文本并移除 placeholder，reject 则移除 placeholder 并调用 `onImageUploadError`。这是 ProseMirror 官方 upload example 的成熟模式。

关键架构决策：上传依赖宿主配置（`uploadImage` 回调），不属于纯 feature，**不进 `featureSpecs` 注册体系**（`feature.plugins?.(schema)` 拿不到 EditorOptions）。插件在 `createEditor` 中按需直接实例化：仅当宿主提供 `uploadImage` 时加入 plugins 数组，未提供时编辑器行为与现状完全一致。

## Feedback Strategy

**Inner-loop command**: `vp test`（必要时按测试文件名过滤到 `tests/image-upload.test.ts`）

**Playground**: 测试套件（jsdom，vite-plus/test）为主；`pnpm dev` playground 用于最终手动验证真实 paste/drop 事件

**Why this approach**: 核心是插件状态机逻辑（placeholder 生命周期、位置映射、成功/失败收尾），jsdom 下直接驱动导出的处理函数 + mock `uploadImage` 是最快循环；真实 ClipboardEvent/DragEvent 行为 jsdom 无法模拟，留给 playground 手动验证。

**测试机制约束（探索结论）**：

- `specs/runner.ts` 的 `applyActions` 只支持键盘 token，无法表达 paste/drop → 行为断言放 `tests/image-upload.test.ts`（独立测试文件，同 `tests/index.test.ts` 风格），不进 `specs/features/*.cases.ts`。
- jsdom 的 `ClipboardEvent` 构造不携带 files → 用 `view.someProp("handlePaste", f => f(view, fakeEvent))` 传伪造事件对象（只需 `clipboardData.files`），或直接调用导出的 `handleImageFiles`。
- jsdom 无 `URL.createObjectURL` → 实现里 guard，无预览时 placeholder 仍渲染占位框。
- 终态断言用 `projectEditorView` + `getMarkdown`；上传中的 placeholder 断言用 `mount.querySelector(".md-image-upload-placeholder")`（blob URL 不稳定，不进 projection 期望串）。

## File Changes

### New Files

| File Path                                      | Purpose                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `packages/editor/src/features/image-upload.ts` | `imageUploadPlugin` + 导出的 `handleImageFiles` 核心函数 + placeholder 状态管理 |
| `packages/editor/tests/image-upload.test.ts`   | 上传全流程行为测试（mock File + mock uploadImage）                              |

### Modified Files

| File Path                       | Changes                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/editor/src/index.ts`  | `EditorOptions` 新增 `uploadImage` / `onImageUploadError`；条件实例化 `imageUploadPlugin`；加入 `dropCursor()` |
| `packages/editor/src/style.css` | `.md-image-upload-placeholder` 上传中样式（半透明预览 + 边框/动画）                                            |
| `packages/editor/package.json`  | 新增依赖 `prosemirror-dropcursor`                                                                              |
| `apps/playground/src/main.ts`   | demo `uploadImage`（模拟延迟 + blob URL）+ `onImageUploadError` console 提示                                   |

## Implementation Details

### 1. EditorOptions 契约扩展

**Pattern to follow**: `packages/editor/src/index.ts` 现有 options 处理

```typescript
export interface EditorOptions {
  // ...existing
  /** 宿主注入：上传图片文件，resolve 为可访问 URL。未提供时编辑器不拦截图片 paste/drop。 */
  uploadImage?: (file: File) => Promise<string>;
  /** 上传失败通知（宿主弹 toast 等）。占位已自动移除，文档无残留。 */
  onImageUploadError?: (file: File, error: unknown) => void;
}
```

`createEditor` 中：

```typescript
plugins: [
  // ...existing
  dropCursor(),
  ...(uploadImage ? [imageUploadPlugin({ uploadImage, onImageUploadError })] : []),
];
```

无 feedback loop（类型 + 接线，typecheck 覆盖）。

### 2. image-upload 插件核心

**Pattern to follow**: `packages/editor/src/features/image-widgets.ts`（decoration plugin 结构）+ ProseMirror 官方 upload example（placeholder 模式）

**Overview**: 插件状态是一个 `DecorationSet`，每个 placeholder 是带唯一 id 的 widget decoration；通过 transaction meta 增删，`apply` 时 `set.map(tr.mapping, tr.doc)`。

```typescript
export interface ImageUploadOptions {
  uploadImage: (file: File) => Promise<string>;
  onImageUploadError?: (file: File, error: unknown) => void;
}

export const imageUploadKey = new PluginKey<DecorationSet>("imageUpload");

export function imageUploadPlugin(options: ImageUploadOptions): Plugin<DecorationSet>;

/** 核心入口：过滤 image/*，逐个创建 placeholder 并发起上传。返回是否处理了任何文件。 */
export function handleImageFiles(
  view: EditorView,
  files: readonly File[],
  pos: number,
  options: ImageUploadOptions,
): boolean;
```

**Key decisions**:

- placeholder 用 widget decoration 而非文档内容 → 上传期间 `getMarkdown()` 零污染（合同硬性要求）。
- 每个文件独立 placeholder id；多文件在同一 pos 依次创建（widget `side: 1`，保持文件顺序）；上传并发进行，各自 resolve 时按**自己 placeholder 的映射位置**插入，先后完成顺序不影响视觉顺序。
- resolve 后查找 placeholder：`set.find(undefined, undefined, spec => spec.id === id)`；**找不到（用户删掉了占位区域）则放弃插入**，只清理 blob URL——不凭空恢复。
- alt 取文件名去扩展名，并剔除 `[ ] ( )` 与换行（防止破坏 `![alt](url)` 语法）；空名兜底 `"image"`。
- 插入文本为 `![${alt}](${url})`，URL 原样信任宿主（见 Failure Modes）。
- `URL.createObjectURL` 存在性 guard；成功/失败/放弃三条路径都 `revokeObjectURL`。
- dispatch 前检查 `view.isDestroyed`。

**Implementation steps**（TDD，红 → 绿 → 重构，每步一个最小行为）:

1. 测试先行：paste 单个 image 文件 → placeholder 出现、markdown 不变 → resolve 后 `![alt](url)` 入文档、widget 渲染、placeholder 消失。实现 plugin 骨架 + `handleImageFiles` happy path。
2. 测试：上传期间在 placeholder 前打字 → 插入位置正确映射。实现依赖 `set.map`，通常步骤 1 已覆盖，跑红确认。
3. 测试：reject → placeholder 消失、markdown 与初始一致、`onImageUploadError(file, error)` 被调用。
4. 测试：上传期间删除 placeholder 所在段落 → resolve 后不插入任何文本。
5. 测试：一次两个文件 → 两个 `![..](..)` 按文件顺序插入。
6. 测试：alt 来自文件名去扩展名且剔除非法字符。

**Feedback loop**:

- **Playground**: 先建 `tests/image-upload.test.ts`，写一个能 new File + deferred promise 的脚手架 smoke test
- **Experiment**: 0/1/2 个文件；resolve/reject；resolve 前编辑（前插、删除占位区）；非法文件名 `a[b].png`
- **Check command**: `vp test`

### 3. paste / drop 事件接线

**Overview**: 插件 props 把 DOM 事件归约到 `handleImageFiles`。

```typescript
props: {
  handlePaste(view, event) {
    const files = collectImageFiles(event.clipboardData?.files);
    if (!files.length) return false; // 非图片粘贴走默认（含 markdown 文本粘贴）
    handleImageFiles(view, files, view.state.selection.from, options);
    return true; // 文件优先：同时含文本与图片文件时只处理文件（Full tier）
  },
  handleDrop(view, event) {
    const files = collectImageFiles(event.dataTransfer?.files);
    if (!files.length) return false;
    const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
    handleImageFiles(view, files, coords?.pos ?? view.state.selection.from, options);
    return true;
  },
}
```

**Key decisions**:

- `collectImageFiles`：`type.startsWith("image/")` 过滤；空结果返回 `false` 让 PM 默认行为（包括现有 `clipboardTextParser` markdown 粘贴）不受影响。
- drop 时 `posAtCoords` 为 null（jsdom 或边缘坐标）回退光标位置。

**Feedback loop**:

- **Playground**: 测试里用伪造事件对象驱动 `someProp("handlePaste"/"handleDrop", ...)`
- **Experiment**: 图片文件 / 纯文本 clipboard / 图片+文本混合 / 非图片文件
- **Check command**: `vp test`

### 4. dropcursor 集成（Full tier）

`pnpm add prosemirror-dropcursor`（packages/editor），`createEditor` plugins 加 `dropCursor()`。无条件启用（对文本拖拽同样有益）。无 feedback loop（一行集成），playground 手动看拖拽指示线。

### 5. placeholder 样式

`.md-image-upload-placeholder`：inline-block、最大宽度限制、半透明（`opacity: .5`）+ 细边框 + 轻微脉冲动画表达"上传中"；无预览（jsdom / createObjectURL 不可用）时退化为固定尺寸灰色占位框。参考现有 `md-image-widget` 样式约束。无 feedback loop（视觉，playground 验证）。

### 6. playground demo

`apps/playground/src/main.ts` 的 `createEditor` 调用加：

```typescript
uploadImage: async (file) => {
  await new Promise((r) => setTimeout(r, 1200)); // 模拟网络延迟，能看见占位态
  return URL.createObjectURL(file); // 本 session 可见；真实接入由宿主换成云上传
},
onImageUploadError: (file, error) => console.error("image upload failed", file.name, error),
```

**Feedback loop**:

- **Playground**: `pnpm dev`
- **Experiment**: 截图粘贴；Finder 拖单/多文件；拖到段落中间看 dropcursor；粘贴纯 markdown 文本确认不回归
- **Check command**: 手动（浏览器）

## Testing Requirements

### Unit / Behavior Tests

| Test File                                    | Coverage                               |
| -------------------------------------------- | -------------------------------------- |
| `packages/editor/tests/image-upload.test.ts` | 上传全流程状态机 + 事件归约 + 契约边界 |

**Key test cases**（每条对应一个行为拐点，命名按需求句式）:

- 粘贴图片文件后立即出现上传占位，且 Markdown 输出不含未完成图片
- 上传成功后在占位位置插入 `![alt](url)`，图片 widget 渲染（断言 `projectEditorView` + `getMarkdown`）
- 上传期间在占位前输入文本，最终插入位置随编辑正确映射
- 上传失败时占位消失、文档与上传前一致、`onImageUploadError` 收到该 file 与 error
- 上传期间占位区域被删除，resolve 后不插入文本
- 一次粘贴多个图片按文件顺序全部插入
- 剪贴板没有图片文件时 `handlePaste` 返回 false（markdown 文本粘贴不回归）
- 非 image/\* 文件不处理
- alt 取文件名去扩展名并剔除 `[]()` 字符
- 未提供 `uploadImage` 时插件不安装（`imageUploadKey.getState` 为 undefined）

测试机制：`new File([bytes], "shot.png", { type: "image/png" })` + 手工 deferred（`let resolve!: (url: string) => void; const p = new Promise(...)`）；resolve 后 `await Promise.resolve()` 刷微任务再断言。

### Manual Testing（playground）

- [ ] 截图 → Cmd+V：占位 → 1.2s 后图片出现，Cmd+/ 看 Markdown 源含 `![](blob:...)`
- [ ] 拖拽本地图片到指定段落中间，dropcursor 指示，插入位置正确
- [ ] 多文件拖入全部插入
- [ ] 上传期间打字、undo，无异常
- [ ] demo 改为 `Promise.reject` 验证失败路径 console 输出、文档无残留

## Error Handling

| Error Scenario                      | Handling Strategy                                                         |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `uploadImage` reject                | 移除 placeholder、revoke blob、调用 `onImageUploadError(file, error)`     |
| `uploadImage` 同步 throw            | 包成 `Promise.resolve().then(() => uploadImage(file))` 统一走 reject 路径 |
| resolve 时 placeholder 已被用户删除 | 放弃插入，仅清理 blob URL                                                 |
| resolve 时 view 已 destroy          | `view.isDestroyed` 检查后直接清理退出                                     |
| `posAtCoords` 返回 null             | 回退到当前光标位置                                                        |

## Failure Modes

| Component        | Failure Mode                                 | Trigger                      | Impact                                           | Mitigation                                                                                                   |
| ---------------- | -------------------------------------------- | ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 插入文本         | URL 含空格 / `)` 不匹配 `IMAGE_RE`           | 宿主返回未编码 URL           | 文本保留但不渲染为图片（仍是合法 markdown 文本） | 命名即可：契约文档注明宿主须返回可直接嵌入的 URL；不做二次编码避免双重编码                                   |
| 插入文本         | 落点在 code_block 内                         | 用户拖图到代码块             | `![..](..)` 作为字面代码文本出现                 | 接受（source-retained 语义自洽）；可在 handleDrop 检查 `$pos.parent.type.spec.code` 时回退光标位置，实现时定 |
| placeholder 映射 | 占位悬空在已删除内容的邻接位置               | 删除范围恰好邻接而非覆盖占位 | 占位仍在、最终插入位置在用户意料之外的邻接处     | 接受（与 PM 官方模式一致）                                                                                   |
| 上传 promise     | 永不 settle                                  | 宿主实现挂起                 | 占位永久存在                                     | 命名即可：超时属于宿主 `uploadImage` 的职责，库不内置超时                                                    |
| blob 预览        | `createObjectURL` 不存在 / 多次粘贴未 revoke | jsdom；高频粘贴              | 无预览；内存泄漏                                 | 存在性 guard；三条退出路径统一 revoke                                                                        |
| demo             | blob URL 刷新后失效                          | playground 重开页面          | 旧文档图片裂图                                   | 接受：demo 仅供手动验证，注释说明                                                                            |

## Validation Commands

```bash
vp check        # 类型与 lint
vp test         # 行为测试（含新增 tests/image-upload.test.ts）
pnpm ready      # 全量 check + test + build + 更新 playground 构建产物
```

## Rollout Considerations

- 无 feature flag：能力默认关闭——`uploadImage` 未提供时插件不安装，零行为变化，对现有宿主完全向后兼容。
- 回滚 = 宿主移除 `uploadImage` 配置。

## Open Items

- [ ] handleDrop 落点在 code_block 时回退光标还是照常插入（实现步骤 3 时跑 playground 定，倾向照常插入保持简单）

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
