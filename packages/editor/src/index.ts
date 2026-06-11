import { baseKeymap } from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { imageUploadPlugin } from "./features/image-upload.ts";
import { createFeatureKeymaps, createFeaturePlugins } from "./features/index.ts";
import { markdownPasteParser } from "./markdown/paste.ts";
import { markdownParser } from "./markdown/parser.ts";
import { markdownSerializer } from "./markdown/serializer.ts";
import { editorSchema } from "./schema/index.ts";
import { cursorRenderPlugin } from "./specs/cursor-render.ts";

export interface EditorOptions {
  mount: HTMLElement;
  initialMarkdown?: string;
  onChange?: (markdown: string) => void;
  cursorProjection?: boolean;
  scrollToSelection?: boolean;
  /**
   * 宿主注入的图片上传：resolve 为可直接嵌入 Markdown 的 URL（不能含空白或 `)`）。
   * 未提供时编辑器不拦截图片粘贴/拖拽。
   */
  uploadImage?: (file: File) => Promise<string>;
  /** 上传失败通知（占位已自动移除，文档无残留）。编辑器已销毁时仍会通知。 */
  onImageUploadError?: (file: File, error: unknown) => void;
}

export interface EditorHandle {
  view: EditorView;
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  destroy: () => void;
}

export function createEditor(options: EditorOptions): EditorHandle {
  const {
    mount,
    initialMarkdown = "",
    onChange,
    cursorProjection = false,
    scrollToSelection = true,
    uploadImage,
    onImageUploadError,
  } = options;

  const state = EditorState.create({
    doc: markdownParser.parse(initialMarkdown) ?? undefined,
    schema: editorSchema,
    plugins: [
      history(),
      keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
      ...createFeatureKeymaps(editorSchema).map((bindings) => keymap(bindings)),
      ...createFeaturePlugins(editorSchema),
      dropCursor(),
      ...(uploadImage ? [imageUploadPlugin({ uploadImage, onImageUploadError })] : []),
      ...(cursorProjection ? [cursorRenderPlugin()] : []),
      keymap(baseKeymap),
    ],
  });

  const view = new EditorView(mount, {
    state,
    clipboardTextParser: markdownPasteParser(),
    handleScrollToSelection: scrollToSelection ? undefined : () => true,
    dispatchTransaction(tr) {
      const next = view.state.apply(tr);
      view.updateState(next);
      if (tr.docChanged && onChange) {
        onChange(serializeMarkdown(next.doc));
      }
    },
  });

  return {
    view,
    getMarkdown: () => serializeMarkdown(view.state.doc),
    setMarkdown(markdown) {
      const doc = markdownParser.parse(markdown);
      const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content);
      tr.setSelection(TextSelection.atEnd(tr.doc));
      view.dispatch(tr);
    },
    destroy: () => view.destroy(),
  };
}

function serializeMarkdown(doc: EditorState["doc"]): string {
  return markdownSerializer.serialize(doc);
}
