import { Fragment } from "prosemirror-model";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { expect, test } from "vite-plus/test";
import {
  applyActions,
  createEditor,
  editorSchema,
  projectEditorView,
  setSpecMarkdown,
} from "../src/index.ts";
import {
  imageLoadInfo,
  imagePluginKey,
  imageSource,
  serializeImageMarkdownFragment,
} from "../src/features/image.ts";

test("image load info maps empty, loading, loaded, and broken states", () => {
  const known = new Map([
    ["ok.png", { status: "loaded" as const, width: 640, height: 320 }],
    ["bad.png", { status: "broken" as const }],
  ]);

  expect(imageLoadInfo("", known)).toEqual({ status: "empty" });
  expect(imageLoadInfo("pending.png", known)).toEqual({ status: "loading" });
  expect(imageLoadInfo("ok.png", known)).toEqual({ status: "loaded", width: 640, height: 320 });
  expect(imageLoadInfo("bad.png", known)).toEqual({ status: "broken" });
});

test("loaded image source shows a full-width preview then folds when cursor leaves", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, cursorProjection: true });
  applyActions(editor.view, ["!", "[", "x", "]", "(", "ok.png", ")"].join("").split(""));

  editor.view.dispatch(
    editor.view.state.tr.setMeta(imagePluginKey, {
      src: "ok.png",
      info: { status: "loaded", width: 640, height: 320 },
    }),
  );

  expect(projectEditorView(editor)).toBe(
    '<p><image-state>image</image-state><pending>![</pending><image-alt>x</image-alt><pending>](</pending><image-src>ok.png</image-src><pending>)</pending>|<image-preview src="ok.png" alt="x"></p>',
  );

  editor.view.dispatch(
    editor.view.state.tr.setSelection(TextSelection.create(editor.view.state.doc, 3)),
  );
  editor.view.dispatch(
    editor.view.state.tr.setSelection(TextSelection.create(editor.view.state.doc, 13)),
  );

  expect(projectEditorView(editor)).toBe('<p><img src="ok.png"  alt="x">|</p>');
  expect(editor.getMarkdown()).toBe("![x](ok.png)");
  editor.destroy();
});

test("broken image source shows broken state and does not fold when cursor leaves", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, cursorProjection: true });
  setSpecMarkdown(editor.view, "![x](bad.png)");

  editor.view.dispatch(
    editor.view.state.tr.setMeta(imagePluginKey, {
      src: "bad.png",
      info: { status: "broken" },
    }),
  );
  editor.view.dispatch(
    editor.view.state.tr.setSelection(TextSelection.create(editor.view.state.doc, 3)),
  );
  editor.view.dispatch(
    editor.view.state.tr.setSelection(TextSelection.create(editor.view.state.doc, 14)),
  );

  expect(projectEditorView(editor)).toBe(
    "<p><image-state>image</image-state><pending>![</pending><image-alt>x</image-alt><pending>](</pending><image-src>bad.png</image-src><pending>)</pending><image-broken>broken</image-broken>|</p>",
  );
  expect(editor.getMarkdown()).toBe("![x](bad.png)");
  editor.destroy();
});

test("entering a rendered image expands source with cursor at alt end", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "![xy](ok.png)", cursorProjection: true });

  editor.view.dispatch(
    editor.view.state.tr.setSelection(TextSelection.create(editor.view.state.doc, 2)),
  );

  expect(projectEditorView(editor)).toBe(
    "<p><image-state>image</image-state><pending>![</pending><image-alt>xy</image-alt>|<pending>](</pending><image-src>ok.png</image-src><pending>)</pending><image-loading>loading</image-loading></p>",
  );
  editor.destroy();
});

test("copying rendered image serializes markdown image source", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "![x](ok.png)" });
  editor.view.dispatch(
    editor.view.state.tr.setSelection(NodeSelection.create(editor.view.state.doc, 1)),
  );
  const copied = editor.view.someProp("clipboardTextSerializer", (serialize) =>
    serialize(editor.view.state.selection.content(), editor.view),
  );

  const image = editorSchema.nodes.image.create({ alt: "x", src: "ok.png", title: null });
  expect(copied).toBe("![x](ok.png)");
  expect(imageSource("x", "ok.png")).toBe("![x](ok.png)");
  expect(serializeImageMarkdownFragment(Fragment.from(image))).toBe("![x](ok.png)");
  editor.destroy();
});
