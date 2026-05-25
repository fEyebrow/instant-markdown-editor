import { expect, test } from "vite-plus/test";
import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { createEditor } from "../src/index.ts";
import { pressKey, typeText } from "./helpers.ts";

function moveToEnd(view: EditorView): void {
  view.dispatch(view.state.tr.setSelection(TextSelection.atEnd(view.state.doc)));
}

test("createEditor mounts and round-trips markdown", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "# Hello\n\nworld" });
  expect(editor.getMarkdown()).toBe("# Hello\n\nworld");
  editor.destroy();
});

test("pasting markdown text parses it as schema nodes", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  const result = editor.view.someProp("clipboardTextParser", (f) =>
    f("# Title\n\n- a\n- b", editor.view.state.doc.resolve(0), false, editor.view),
  );
  expect(result).not.toBeNull();
  const slice = result as import("prosemirror-model").Slice;
  expect(slice.content.firstChild?.type.name).toBe("heading");
  editor.destroy();
});

test("pasting empty string returns falsy (PM handles as plain)", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  const result = editor.view.someProp("clipboardTextParser", (f) =>
    f("", editor.view.state.doc.resolve(0), false, editor.view),
  );
  expect(result).toBeFalsy();
  editor.destroy();
});

test("Enter on '---' inside a list item does NOT make a top-level hr", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "- a" });
  moveToEnd(editor.view);
  pressKey(editor.view, "Enter");
  typeText(editor.view, "---");
  pressKey(editor.view, "Enter");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("bullet_list");
  editor.destroy();
});

test("Enter on a non-empty list item splits into a new sibling item", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "- a" });
  moveToEnd(editor.view);
  pressKey(editor.view, "Enter");
  typeText(editor.view, "b");
  const list = editor.view.state.doc.firstChild!;
  expect(list.type.name).toBe("bullet_list");
  expect(list.childCount).toBe(2);
  expect(list.child(1).textContent).toBe("b");
  editor.destroy();
});

test("Enter on an empty trailing list item exits to paragraph", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "- a" });
  moveToEnd(editor.view);
  pressKey(editor.view, "Enter");
  pressKey(editor.view, "Enter");
  expect(editor.view.state.doc.lastChild?.type.name).toBe("paragraph");
  editor.destroy();
});

test("Tab sinks a list item into a nested list", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "- a\n- b" });
  moveToEnd(editor.view);
  pressKey(editor.view, "Tab");
  const outerItem = editor.view.state.doc.firstChild!.firstChild!;
  expect(outerItem.lastChild?.type.name).toBe("bullet_list");
  editor.destroy();
});

test("Shift-Tab lifts a nested list item back up", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "- a\n- b" });
  moveToEnd(editor.view);
  pressKey(editor.view, "Tab");
  pressKey(editor.view, "Shift-Tab");
  expect(editor.view.state.doc.firstChild?.childCount).toBe(2);
  editor.destroy();
});
