import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { EditorView } from "prosemirror-view";

export interface ImageUploadOptions {
  uploadImage: (file: File) => Promise<string>;
  onImageUploadError?: (file: File, error: unknown) => void;
}

interface PlaceholderMeta {
  add?: { id: symbol; pos: number; previewUrl: string | null };
  remove?: { id: symbol };
}

export const imageUploadKey = new PluginKey<DecorationSet>("imageUpload");

export function imageUploadPlugin(options: ImageUploadOptions): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: imageUploadKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set) {
        let next = set.map(tr.mapping, tr.doc);
        const meta = tr.getMeta(imageUploadKey) as PlaceholderMeta | undefined;
        if (meta?.add) {
          const { id, pos, previewUrl } = meta.add;
          const widget = Decoration.widget(pos, () => buildPlaceholder(previewUrl), {
            id,
            side: 1,
          });
          next = next.add(tr.doc, [widget]);
        }
        if (meta?.remove) {
          const { id } = meta.remove;
          next = next.remove(next.find(undefined, undefined, (spec) => spec.id === id));
        }
        return next;
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
      handlePaste(view, event) {
        const files = collectImageFiles(event.clipboardData?.files);
        if (files.length === 0) return false;
        // 文本与图片文件同在时文件优先，避免双重插入。
        return handleImageFiles(view, files, view.state.selection.from, options);
      },
      handleDrop(view, event) {
        const files = collectImageFiles(event.dataTransfer?.files);
        if (files.length === 0) return false;
        const pos = dropPosition(view, event) ?? view.state.selection.from;
        return handleImageFiles(view, files, pos, options);
      },
    },
  });
}

function noop(): void {}

function collectImageFiles(files: FileList | null | undefined): File[] {
  return Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
}

function dropPosition(view: EditorView, event: DragEvent): number | null {
  try {
    return view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null;
  } catch {
    // 无布局环境（如 jsdom）里 posAtCoords 可能直接抛错
    return null;
  }
}

export function handleImageFiles(
  view: EditorView,
  files: readonly File[],
  pos: number,
  options: ImageUploadOptions,
): boolean {
  const images = files.filter((file) => file.type.startsWith("image/"));
  if (images.length === 0) return false;

  const insertPos = TextSelection.near(view.state.doc.resolve(pos)).from;
  // 上传并发，完成步骤按文件顺序串行，保证多文件插入顺序与文件顺序一致。
  let chain = Promise.resolve();
  for (const image of images) {
    const id = Symbol("image-upload");
    const previewUrl =
      typeof URL.createObjectURL === "function" ? URL.createObjectURL(image) : null;
    addPlaceholder(view, id, insertPos, previewUrl);
    const upload = Promise.resolve().then(() => options.uploadImage(image));
    // 失败收尾不排队：前面有上传挂起时，后面文件的失败也要立即清理并通知。
    upload.catch((error) => {
      releasePreview(previewUrl);
      removePlaceholder(view, id);
      options.onImageUploadError?.(image, error);
    });
    chain = chain.then(() =>
      upload.then((url) => {
        releasePreview(previewUrl);
        finishUpload(view, id, image, url);
      }, noop),
    );
  }
  return true;
}

function addPlaceholder(
  view: EditorView,
  id: symbol,
  pos: number,
  previewUrl: string | null,
): void {
  const meta: PlaceholderMeta = { add: { id, pos, previewUrl } };
  view.dispatch(view.state.tr.setMeta(imageUploadKey, meta));
}

function finishUpload(view: EditorView, id: symbol, file: File, url: string): void {
  if (view.isDestroyed) return;
  const placeholder = findPlaceholder(view, id);
  if (!placeholder) return;
  const meta: PlaceholderMeta = { remove: { id } };
  const text = `![${altFromFile(file)}](${url})`;
  view.dispatch(view.state.tr.insertText(text, placeholder.from).setMeta(imageUploadKey, meta));
}

function removePlaceholder(view: EditorView, id: symbol): void {
  if (view.isDestroyed) return;
  if (!findPlaceholder(view, id)) return;
  const meta: PlaceholderMeta = { remove: { id } };
  view.dispatch(view.state.tr.setMeta(imageUploadKey, meta));
}

function findPlaceholder(view: EditorView, id: symbol): Decoration | null {
  const set = imageUploadKey.getState(view.state);
  const found = set?.find(undefined, undefined, (spec) => spec.id === id) ?? [];
  return found[0] ?? null;
}

function releasePreview(previewUrl: string | null): void {
  if (previewUrl && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(previewUrl);
  }
}

function altFromFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, "");
  const sanitized = base.replace(/[[\]()\n]/g, "").trim();
  return sanitized || "image";
}

function buildPlaceholder(previewUrl: string | null): HTMLElement {
  const span = document.createElement("span");
  span.className = "md-image-upload-placeholder";
  if (previewUrl) {
    const img = document.createElement("img");
    img.setAttribute("src", previewUrl);
    span.appendChild(img);
  }
  return span;
}
