import { expect, test } from "vite-plus/test";
import { Slice } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { createEditor, type EditorHandle, type EditorOptions } from "../src/index.ts";
import { handleImageFiles, imageUploadKey } from "../src/features/image-upload.ts";
import { projectEditorView } from "../src/specs.ts";
import { typeText } from "./helpers.ts";

interface Deferred {
  promise: Promise<string>;
  resolve: (url: string) => void;
  reject: (error: unknown) => void;
}

function deferred(): Deferred {
  let resolve!: (url: string) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function imageFile(name = "shot.png", type = "image/png"): File {
  return new File(["x"], name, { type });
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function mountEditor(options: Partial<EditorOptions> = {}): {
  editor: EditorHandle;
  mount: HTMLElement;
} {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, cursorProjection: true, ...options });
  return { editor, mount };
}

function placeholders(mount: HTMLElement): NodeListOf<Element> {
  return mount.querySelectorAll(".md-image-upload-placeholder");
}

function moveToStart(editor: EditorHandle): void {
  const { state } = editor.view;
  editor.view.dispatch(state.tr.setSelection(TextSelection.atStart(state.doc)));
}

test("粘贴图片文件后立即出现上传占位且 Markdown 不含未完成图片，上传成功后该位置插入 ![alt](url) 并渲染图片", async () => {
  const upload = deferred();
  const { editor, mount } = mountEditor({
    initialMarkdown: "hello",
    uploadImage: () => upload.promise,
  });

  const handled = handleImageFiles(editor.view, [imageFile()], 6, {
    uploadImage: () => upload.promise,
  });

  expect(handled).toBe(true);
  expect(placeholders(mount).length).toBe(1);
  expect(editor.getMarkdown()).toBe("hello");

  upload.resolve("https://cdn.example/shot.png");
  await flush();

  expect(placeholders(mount).length).toBe(0);
  expect(editor.getMarkdown()).toBe("hello![shot](https://cdn.example/shot.png)");
  moveToStart(editor);
  expect(projectEditorView(editor)).toBe(
    '<p>|hello<img src="https://cdn.example/shot.png" alt="shot"></p>',
  );
  editor.destroy();
});

test("上传期间在占位前编辑文本，最终插入位置随编辑正确映射", async () => {
  const upload = deferred();
  const options = { uploadImage: () => upload.promise };
  const { editor } = mountEditor({ initialMarkdown: "hello", ...options });

  handleImageFiles(editor.view, [imageFile()], 6, options);
  moveToStart(editor);
  typeText(editor.view, "X");

  upload.resolve("https://u.example/i.png");
  await flush();

  expect(editor.getMarkdown()).toBe("Xhello![shot](https://u.example/i.png)");
  editor.destroy();
});

test("上传失败时占位消失、文档与上传前一致、onImageUploadError 收到该文件与错误", async () => {
  const upload = deferred();
  const failures: Array<{ file: File; error: unknown }> = [];
  const options = {
    uploadImage: () => upload.promise,
    onImageUploadError: (file: File, error: unknown) => failures.push({ file, error }),
  };
  const { editor, mount } = mountEditor({ initialMarkdown: "hello", ...options });

  const file = imageFile();
  handleImageFiles(editor.view, [file], 6, options);
  expect(placeholders(mount).length).toBe(1);

  const boom = new Error("upload rejected");
  upload.reject(boom);
  await flush();

  expect(placeholders(mount).length).toBe(0);
  expect(editor.getMarkdown()).toBe("hello");
  expect(failures).toEqual([{ file, error: boom }]);
  editor.destroy();
});

test("上传期间占位区域被删除，上传成功后不再插入文本", async () => {
  const upload = deferred();
  const options = { uploadImage: () => upload.promise };
  const { editor, mount } = mountEditor({ initialMarkdown: "hello", ...options });

  handleImageFiles(editor.view, [imageFile()], 6, options);
  const { state } = editor.view;
  editor.view.dispatch(state.tr.delete(0, state.doc.content.size));
  expect(placeholders(mount).length).toBe(0);

  upload.resolve("https://u.example/i.png");
  await flush();

  expect(editor.getMarkdown()).toBe("");
  editor.destroy();
});

test("一次粘贴多个图片按文件顺序插入，与上传完成先后无关", async () => {
  const uploadA = deferred();
  const uploadB = deferred();
  const byName = new Map([
    ["a.png", uploadA.promise],
    ["b.png", uploadB.promise],
  ]);
  const options = { uploadImage: (file: File) => byName.get(file.name)! };
  const { editor, mount } = mountEditor(options);

  handleImageFiles(editor.view, [imageFile("a.png"), imageFile("b.png")], 1, options);
  expect(placeholders(mount).length).toBe(2);

  uploadB.resolve("https://u.example/b.png");
  await flush();
  uploadA.resolve("https://u.example/a.png");
  await flush();

  expect(editor.getMarkdown()).toBe("![a](https://u.example/a.png)![b](https://u.example/b.png)");
  expect(placeholders(mount).length).toBe(0);
  editor.destroy();
});

test("批次中前一个上传未完成时，后一个文件的失败立即清理占位并通知", async () => {
  const uploadA = deferred();
  const uploadB = deferred();
  const byName = new Map([
    ["a.png", uploadA.promise],
    ["b.png", uploadB.promise],
  ]);
  const failures: File[] = [];
  const options = {
    uploadImage: (file: File) => byName.get(file.name)!,
    onImageUploadError: (file: File) => failures.push(file),
  };
  const { editor, mount } = mountEditor(options);

  handleImageFiles(editor.view, [imageFile("a.png"), imageFile("b.png")], 1, options);

  uploadB.reject(new Error("b failed"));
  await flush();

  expect(placeholders(mount).length).toBe(1);
  expect(failures.map((file) => file.name)).toEqual(["b.png"]);

  uploadA.resolve("https://u.example/a.png");
  await flush();
  expect(editor.getMarkdown()).toBe("![a](https://u.example/a.png)");
  expect(placeholders(mount).length).toBe(0);
  editor.destroy();
});

test("alt 取文件名去扩展名并剔除方括号圆括号", async () => {
  const upload = deferred();
  const options = { uploadImage: () => upload.promise };
  const { editor } = mountEditor(options);

  handleImageFiles(editor.view, [imageFile("my [shot] (1).png")], 1, options);
  upload.resolve("https://u.example/i.png");
  await flush();

  expect(editor.getMarkdown()).toBe("![my shot 1](https://u.example/i.png)");
  editor.destroy();
});

test("非 image/* 文件不处理，handleImageFiles 返回 false 且不出现占位", () => {
  const options = { uploadImage: () => Promise.resolve("unused") };
  const { editor, mount } = mountEditor(options);

  const handled = handleImageFiles(editor.view, [imageFile("notes.txt", "text/plain")], 1, options);

  expect(handled).toBe(false);
  expect(placeholders(mount).length).toBe(0);
  editor.destroy();
});

test("未提供 uploadImage 时不安装 image-upload 插件", () => {
  const { editor } = mountEditor();
  expect(imageUploadKey.getState(editor.view.state)).toBeUndefined();
  editor.destroy();
});

function pasteFiles(editor: EditorHandle, files: File[]): boolean {
  const event = { clipboardData: { files } } as unknown as ClipboardEvent;
  return Boolean(editor.view.someProp("handlePaste", (f) => f(editor.view, event, Slice.empty)));
}

test("粘贴事件携带图片文件时被插件接管并出现占位", () => {
  const upload = deferred();
  const { editor, mount } = mountEditor({
    initialMarkdown: "hi",
    uploadImage: () => upload.promise,
  });

  expect(pasteFiles(editor, [imageFile()])).toBe(true);
  expect(placeholders(mount).length).toBe(1);
  editor.destroy();
});

test("剪贴板没有图片文件时 handlePaste 放行（markdown 文本粘贴不回归）", () => {
  const upload = deferred();
  const { editor, mount } = mountEditor({ uploadImage: () => upload.promise });

  expect(pasteFiles(editor, [])).toBe(false);
  expect(pasteFiles(editor, [imageFile("notes.txt", "text/plain")])).toBe(false);
  expect(placeholders(mount).length).toBe(0);
  editor.destroy();
});

test("拖入图片文件时被插件接管，坐标不可定位时回退到光标位置", async () => {
  const upload = deferred();
  const { editor, mount } = mountEditor({
    initialMarkdown: "hello",
    uploadImage: () => upload.promise,
  });

  const event = {
    dataTransfer: { files: [imageFile()] },
    clientX: 0,
    clientY: 0,
  } as unknown as DragEvent;
  const handled = Boolean(
    editor.view.someProp("handleDrop", (f) => f(editor.view, event, Slice.empty, false)),
  );

  expect(handled).toBe(true);
  expect(placeholders(mount).length).toBe(1);

  upload.resolve("https://u.example/i.png");
  await flush();
  expect(editor.getMarkdown()).toBe("![shot](https://u.example/i.png)hello");
  editor.destroy();
});
