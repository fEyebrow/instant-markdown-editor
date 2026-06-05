# Implementation Spec: Markdown Image Feature

**Contract**: ./contract.md
**Estimated Effort**: M

## Technical Approach

新增 `image` inline feature，沿用 ADR-0001 的 source-retained 流水线：`![alt](url)` 整段始终是文档真 text；`parseInline` 识别后 `normalize` 在内容上挂 `image` semantic mark；`inline-decorations` 根据光标位置隐/显源；一个新的 widget plugin 在源位置注入 `<img>` widget。

与 `link.ts` 的同构差异有四处：(1) 正则强制要求 `!` 前缀；(2) `delimRanges` 默认覆盖**整段** `[openFrom, closeTo)`，而不是 link 的两段 open/close — 因为 image 没有需要保留显示的 label content；(3) 当 `url === ""` 时所有 delim 都不隐藏、widget 不产生；(4) 引入第一个 `Decoration.widget` 用法，因此需要一个新 plugin `image-widgets.ts`（不污染 `inline-decorations.ts` 现有逻辑）。

Markdown round-trip：markdown-it 的 `image` 是 self-closing token，handler 输出 source-retained 的 `![<alt>](<src>)` 真 text + 在 alt 上挂 image mark；serializer 不需要任何 image 专属代码，因为 source 已经是 doc 文本。

## Feedback Strategy

**Inner-loop command**: `vp test --filter live-image`

**Playground**: `vp test` (spec runner) + `pnpm dev` 手动验证 widget 视觉。Spec runner 走的是 jsdom + projection 文本断言，最快；视觉效果（block-centered widget、broken-img 状态）必须在 `apps/playground` 浏览器里看一遍。

**Why this approach**: 投影规则、source/widget 状态机、Markdown round-trip 都可以由 spec cases 用文本投影完整断言；只有 widget 的 CSS 居中与浏览器默认 broken-img 行为需要 playground 肉眼验证。

## File Changes

### New Files

| File Path                                                | Purpose                                                                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/editor/src/features/image.ts`                  | `FeatureSpec`：image mark schema、parserToken、inline scan（priority/markNames/extRanges），及 widget plugin 导出。                                                                  |
| `packages/editor/src/features/image-widgets.ts`          | `Plugin<DecorationSet>`：从 `normalizeInlineKey` 读 spans，给 src 非空的 image span 生成 `Decoration.widget`（位置=`closeTo`，渲染 `<img class="md-image-widget" src alt title>`）。 |
| `packages/editor/src/specs/features/live-image.cases.ts` | 行为 spec：source projection、cursor reveal/hide、empty url、broken/repaired、与 link 互不干扰、alt 内 inline markdown 失活、round-trip。                                            |

### Modified Files

| File Path                                        | Changes                                                                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/editor/src/features/index.ts`          | 注册 `image` 到 `featureSpecs`（放在 `link` 之前，使 image priority 先消费 `![`）；将 `image-widgets` plugin 挂到 feature 的 `plugins` 字段。       |
| `packages/editor/src/specs/index.ts`             | 注册 `liveImageSpec`。                                                                                                                              |
| `packages/editor/src/specs/runner.ts`            | `DEFAULT_TAGS` 添加 `IMG` serializer（输出 `<img src="..." alt="..." title="...">`，按 link 那种 attr 处理顺序），确保 spec 投影能稳定断言 widget。 |
| `apps/playground/src/styles.css` 或对应 CSS 文件 | 加 `.md-image-widget` 块级居中样式：`display:block; margin:1em auto; max-width:100%`。                                                              |

## Implementation Details

### 1. image mark schema + parser token

**Pattern to follow**: `packages/editor/src/features/link.ts`

**Overview**: 与 link 同构的 inline feature，区别是带 `!` 前缀、整段属于 source。

```ts
// features/image.ts (核心片段)
const IMAGE_RE = /!\[([^\]\n]*?)\]\(([^\s)\n]*)(?:\s+"([^"\n]*)")?\)/g;

export const image: FeatureSpec = {
  name: "image",
  marks: {
    image: {
      attrs: { src: {}, alt: { default: "" }, title: { default: null } },
      inclusive: false,
      // 没有 parseDOM/toDOM：mark 只是 source 标识，不直接渲染（widget 渲染由 decoration 完成）。
      parseDOM: [],
      toDOM() {
        return ["span", { class: "md-image-source" }, 0];
      },
    } as MarkSpec,
  },
  parserTokens: {
    image: (state, token, schema) => {
      const src = token.attrGet("src") ?? "";
      const alt = token.content ?? "";
      const title = token.attrGet("title") || null;
      state.addText("![");
      state.openMark(schema.marks.image.create({ src, alt, title }));
      state.addText(alt);
      state.closeMarkType(schema.marks.image);
      const close = title ? `](${src} "${title.replace(/"/g, '\\"')}")` : `](${src})`;
      state.addText(close);
    },
  },
  inline: {
    priority: 2, // 早于 link(3) 与 emphasis 系列
    markNames: ["image"],
    scan, // 见下
    extRanges: (parent) => {
      /* 与 link.extRanges 同模式，但要求 ! 前缀 */
    },
  },
  plugins: () => [imageWidgetsPlugin()],
};
```

**Key decisions**:

- mark 的 `attrs` 保留 src/alt/title，供 widget 渲染读取（mark 由 normalize 用最新 parse 结果重置 attrs，所以编辑源 → widget 自动同步）。
- mark.toDOM 用 `<span class="md-image-source">`：不影响视觉（CSS 不给样式），仅作为可选 hook。视觉效果完全来自 widget decoration + 源 hide/show class。
- 不为 mark 提供 parseDOM（设为空数组）：外部 HTML 粘贴目前不解析 `<img>`，符合 outOfScope。

**Implementation steps**:

1. 复制 link.ts 结构，改正则、改 closeDelimText、改 parser token name。
2. `scan` 中：(a) 匹配 `IMAGE_RE`；(b) 计算 `openFrom=match.index`, `openTo=openFrom+2`（即 `![`），`contentFrom=openTo`, `contentTo=contentFrom+alt.length`, `closeFrom=contentTo`, `closeTo=fullEnd`；(c) `markConsumed(consumed, openFrom, closeTo)` 整段独占；(d) 设置 `delimRanges`：见步骤 3。
3. **delimRanges**：
   - 当 `src !== ""`：`[{ from: openFrom, to: closeTo }]` — 整段交给 decoration，按默认 cursor-aware 规则（在=显，外=隐）。
   - 当 `src === ""`：返回 **空 delimRanges** `[]`，源始终可见。
4. 在 `parserTokens.image` 中输出 source-retained 字符串。markdown-it 的 `image` 是 self-closing，handler 直接走 single function。
5. `extRanges` 让 normalize 知道整个 image 段属于 image mark 的活动区间（防止其它 mark 跨进来）。

**Feedback loop**:

- Playground: 在 `live-image.cases.ts` 写第一个 case `image-source-projects`。
- Experiment: 输入 `![a](b)`，断言 step 6 投影。
- Check command: `vp test --filter live-image`

---

### 2. image-widgets plugin

**Pattern to follow**: `packages/editor/src/features/inline-decorations.ts` 的 plugin 形态；切换为 `Decoration.widget`。

**Overview**: 独立 plugin，从 `normalizeInlineKey` 读 spans，为 src 非空的 image span 生成 widget DOM。

```ts
// features/image-widgets.ts (核心片段)
export function imageWidgetsPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    state: {
      init: (_, state) => build(state),
      apply: (_tr, _prev, _old, next) => build(next),
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}

function build(state: EditorState): DecorationSet {
  const plan = normalizeInlineKey.getState(state);
  if (!plan) return DecorationSet.empty;
  const decos: Decoration[] = [];
  for (const block of plan.blocks) {
    for (const span of block.spans) {
      if (span.type !== "image") continue;
      const src = String(span.attrs?.src ?? "");
      if (!src) continue;
      const alt = String(span.attrs?.alt ?? "");
      const title = span.attrs?.title as string | null | undefined;
      const pos = block.blockStart + span.closeTo;
      decos.push(Decoration.widget(pos, () => buildImg(src, alt, title), { side: 1 }));
    }
  }
  return decos.length ? DecorationSet.create(state.doc, decos) : DecorationSet.empty;
}

function buildImg(src: string, alt: string, title: string | null | undefined): HTMLElement {
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  if (title) img.title = title;
  img.className = "md-image-widget";
  return img;
}
```

**Key decisions**:

- Widget 插入位置：`closeTo`（源末尾右侧），side=1 避免和源末尾光标重叠。
- 没有 src 不创建 widget — 与 contract "url 空不渲染 widget" 一致。
- 不监听 load 失败 — 走浏览器默认 broken-img，符合 contract。
- DOM 节点用普通 `<img>`，靠 CSS `.md-image-widget { display:block; margin:1em auto; max-width:100% }` 实现"段落里只要有 image 就单行块级居中"。这意味着 inline 文字会被 widget block 排版打断，符合用户在 interview 中的明确选择。

**Implementation steps**:

1. 新建文件，参考上面骨架。
2. 在 `features/image.ts` 的 `plugins` 字段 export 出去。
3. CSS：把样式写到 `apps/playground` 的全局样式（或 packages/editor 的 default style，如果有）。若编辑器没有 CSS 模块，新增 `.md-image-widget` 到 playground `styles.css`。
4. 手动在 `pnpm dev` 验证：单段 `![hi](https://placekitten.com/200/200)` → 单行块居中；段中 `text ![hi](url) tail` → image widget 仍单行块居中、text 与 tail 分别处于 widget 上方/下方。

**Feedback loop**:

- Playground: `pnpm dev` 打开 playground。
- Experiment: 粘贴 `![](https://placekitten.com/200/200)` 和 `text ![alt](https://placekitten.com/200/200) tail` 两种 markdown，光标进/出。
- Check command: 视觉确认 + `vp test --filter live-image`。

---

### 3. spec cases (live-image.cases.ts)

**Pattern to follow**: `packages/editor/src/specs/features/live-link.cases.ts`

**Overview**: 用户可见行为定义。每个 case 对应一条用 plain English 表达的需求。

**Implementation steps**: 至少包含以下 8 个 case，与 contract success criteria 一一对应：

1. `live-image-source-projects` — 输入 `![x](y)` 6 步后 → `<p>{img}<pending>![x](y)</pending>|</p>`（光标在 closeTo，仍在源范围内）。
2. `live-image-hides-source-on-leave` — 上一例之后再按 `Space` → `<p>{img} |</p>` + markdown `![x](y) `。
3. `live-image-reveals-on-cursor-enter` — initialMarkdown `![x](y)` + 一次 `ArrowLeft` → 进入源范围，源 pending 重新可见。
4. `live-image-empty-url-keeps-source-visible` — initialMarkdown `![a]()`，无任何 key event → 源始终可见、**无** img widget；markdown round-trip `![a]()`。
5. `live-image-empty-url-no-widget-even-on-leave` — `![a]() ` 末尾输入空格，源不被隐藏，无 widget。
6. `live-image-broken-source-loses-widget` — `![x](y)` 后 `Backspace` 删 `)`，widget 消失，文本变 plain `![x](y`；再补 `)` widget 重现。
7. `live-image-does-not-trigger-on-bracket-only` — 输入 `[x](y)` → 触发 link，**不**触发 image。
8. `live-image-alt-keeps-inline-markup-as-plain` — initialMarkdown `![**a**](b)` → alt 内 `**a**` 不获得 strong；投影 `<p>{img}<pending>![**a**](b)</pending>|</p>`（光标末尾在源内）。

Spec runner 已有的 `<pending>` 隐显机制刚好对接 `syntax-hint`/`syntax-hidden` class；`{img}` 由 `DEFAULT_TAGS.IMG` 投影成 `<img src="y" alt="x">` 风格的稳定字符串。

**Key decisions**:

- 投影里用 `{img}` 表示——实际写 case 时用 `'<img src="y" alt="x">'` literal（参考 `A:` serializer 风格）。
- 不写 "drag/paste/upload/resize" 任何 case — 它们是 outOfScope。

**Feedback loop**:

- Playground: `vp test --filter live-image`。
- Experiment: 一次写一条 case，红 → 绿 → 重构。每条 case 先 `vp test` 看到失败，再实现。
- Check command: `vp test --filter live-image`。

---

### 4. runner.ts: IMG serializer

**Overview**: 让 `projectEditorView` 把 widget `<img>` 输出成可断言的稳定字符串。

```ts
// runner.ts DEFAULT_TAGS 追加
IMG: (_c, el) => {
  const src = el.getAttribute("src") ?? "";
  const alt = el.getAttribute("alt") ?? "";
  const title = el.getAttribute("title");
  const attrs = [
    ` src="${escapeAttribute(src)}"`,
    alt ? ` alt="${escapeAttribute(alt)}"` : "",
    title ? ` title="${escapeAttribute(title)}"` : "",
  ].join("");
  return `<img${attrs}>`;
},
```

**Key decisions**: 输出顺序固定 src → alt → title；alt 空时省略；title 空时省略。与现有 `A:` serializer 风格一致。

---

### 5. Feature registration order

**Overview**: `features/index.ts` 中 `image` 必须排在 `link` **之前**（数组顺序无关，但 priority=2 < link.priority=3，所以 `parseInline` 会先处理 image，对 `![` 段标 consumed，link 不会再扫描进来）。

**Implementation steps**:

1. `import { image } from "./image.ts";`
2. 把 `image` 放进 `featureSpecs` 数组（推荐放在 link 上方一行，可读性更好）。

## Testing Requirements

### Spec Cases

| Test File                                                | Coverage                                         |
| -------------------------------------------------------- | ------------------------------------------------ |
| `packages/editor/src/specs/features/live-image.cases.ts` | 全部 8 条 case，对应 contract success criteria。 |

**Key cases**: 见上一节 Implementation Details > 3。

### Manual Testing (playground)

- [ ] `pnpm dev` 打开 playground，粘贴单行 `![cat](https://placekitten.com/300/300)`，看到 widget 块级居中。
- [ ] 同段写 `hello ![cat](https://placekitten.com/300/300) world`，看到 widget 仍单行居中、文字被 widget block 上下断开。
- [ ] 输入 `![bad](nonexistent.png)`，看到浏览器默认 broken-img。
- [ ] 输入 `![empty]()`，看不到 widget，源 `![empty]()` 始终可见。
- [ ] 光标点 widget 旁边、按 ArrowLeft 进入源，源 `![cat](...)` 重新可见可编辑；ArrowRight 离开后源消失。
- [ ] 切到 `Mod+/` markdown 模式，看到序列化结果与输入一致。

## Failure Modes

| Component                      | Failure Mode                      | Trigger                              | Impact                                    | Mitigation                                                                               |
| ------------------------------ | --------------------------------- | ------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| image.scan                     | 与 link 抢同段 source             | `![x](y)` 这种串                     | image 不优先则 link 抢 `[x](y)`           | priority=2 + `markConsumed(openFrom, closeTo)` 整段独占                                  |
| image.scan                     | 嵌套被外部 mark 抢走              | `**![x](y)**`                        | strong 误把 image source 当 emphasis 内容 | image priority 高于 emphasis；scan 先标 consumed                                         |
| imageWidgetsPlugin             | 源被破坏但 widget 残留            | 删除 `)` 后 plan 仍残留旧 span       | 视觉错位                                  | plugin 每次都基于最新 `normalizeInlineKey` state 重算 DecorationSet — 不缓存，无残留风险 |
| imageWidgetsPlugin             | src 是恶意 URL（javascript:...）  | 用户输入 `![x](javascript:alert(1))` | XSS                                       | `<img src>` 不会执行 javascript: URL；浏览器忽略。无需额外处理。                         |
| imageWidgetsPlugin             | src 包含 quote/<>/&               | `![x](a"b)`                          | DOM attr 解析失败                         | 用 `img.setAttribute('src', src)`（属性赋值，已自动转义），不要拼字符串                  |
| inline-decorations interaction | 整段 hide 时无法定位光标          | 用户按 ArrowLeft 想进源              | 光标显示可能跳过隐藏区                    | 用 `syntax-hidden` 现有 CSS（`display:inline`、内容仍占位）；不要用 `display:none`       |
| parser                         | markdown-it 给 `tok.content` 是空 | `![](url)`                           | alt 文本为空                              | `tok.content ?? ""` 保底；mark.attrs.alt 默认 ""                                         |
| Markdown round-trip            | title 含 `"`                      | `![x](y "she said \"hi\"")`          | serializer 输出破损                       | parserToken 里 `title.replace(/"/g, '\\"')`；scan 正则 `[^"\n]` 已防同行内嵌 quote 失败  |

## Validation Commands

```bash
vp test --filter live-image    # 跑新 spec
vp test                        # 全量 spec
vp check                       # type + lint
pnpm ready                     # check + test + build
```

## Open Items

- [ ] CSS 文件位置：确认是放到 `apps/playground/src/styles.css` 还是 `packages/editor` 提供默认样式（取决于 editor 是否暴露 css）；实现时查 playground 现有 css 结构。
- [ ] 是否在 contextmenu / Enter 时也阻断光标穿过 widget？MVP 不做特殊处理，让光标自然落在源 text 上即可。

---

_This spec is ready for implementation. TDD: 一次一条 case，红→绿→重构。_
