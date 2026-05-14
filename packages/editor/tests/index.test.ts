import { expect, test } from "vite-plus/test";
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import { createEditor } from "../src/index.ts";
import { pressKey, typeText } from "./helpers.ts";

test("createEditor mounts and round-trips markdown", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "# Hello\n\nworld" });
  expect(editor.getMarkdown()).toBe(defaultMarkdownSerializer.serialize(editor.view.state.doc));
  expect(editor.getMarkdown()).toContain("# Hello");
  editor.destroy();
});

test("typing '# foo' converts the paragraph to an H1", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "# foo");
  expect(editor.getMarkdown()).toBe("# foo");
  editor.destroy();
});

test("typing N '#' chars + space produces heading level N for N in 1..6", () => {
  for (let level = 1; level <= 6; level++) {
    const mount = document.createElement("div");
    const editor = createEditor({ mount });
    typeText(editor.view, "#".repeat(level) + " heading");
    expect(editor.getMarkdown()).toBe("#".repeat(level) + " heading");
    expect(editor.view.state.doc.firstChild?.type.name).toBe("heading");
    expect(editor.view.state.doc.firstChild?.attrs.level).toBe(level);
    editor.destroy();
  }
});

test("typing '# ' mid-paragraph does NOT fire the heading rule", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "hello # world");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("paragraph");
  expect(editor.getMarkdown()).toBe("hello # world");
  editor.destroy();
});

test("typing '# ' inside a code block does NOT fire the heading rule", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "```\n\n```" });
  typeText(editor.view, "# not a heading");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("code_block");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("# not a heading");
  editor.destroy();
});

test("Backspace immediately after heading conversion undoes the rule", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "# ");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("heading");
  pressKey(editor.view, "Backspace");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("paragraph");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("# ");
  editor.destroy();
});

test("typing '- a' wraps the paragraph into a bullet list", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "- a");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("bullet_list");
  expect(editor.view.state.doc.firstChild?.firstChild?.type.name).toBe("list_item");
  expect(editor.view.state.doc.textContent).toBe("a");
  editor.destroy();
});

test("'* ' and '+ ' also trigger bullet list", () => {
  for (const marker of ["* ", "+ "]) {
    const mount = document.createElement("div");
    const editor = createEditor({ mount });
    typeText(editor.view, marker + "x");
    expect(editor.view.state.doc.firstChild?.type.name).toBe("bullet_list");
    editor.destroy();
  }
});

test("typing '1. a' wraps the paragraph into an ordered list", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "1. a");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("ordered_list");
  expect(editor.view.state.doc.firstChild?.attrs.order).toBe(1);
  expect(editor.view.state.doc.textContent).toBe("a");
  editor.destroy();
});

test("Enter on a non-empty list item splits into a new sibling item", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "- a");
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
  const editor = createEditor({ mount });
  typeText(editor.view, "- a");
  pressKey(editor.view, "Enter");
  pressKey(editor.view, "Enter");
  expect(editor.view.state.doc.lastChild?.type.name).toBe("paragraph");
  editor.destroy();
});

test("Tab sinks a list item into a nested list", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "- a");
  pressKey(editor.view, "Enter");
  typeText(editor.view, "b");
  pressKey(editor.view, "Tab");
  const outerItem = editor.view.state.doc.firstChild!.firstChild!;
  expect(outerItem.lastChild?.type.name).toBe("bullet_list");
  editor.destroy();
});

test("typing '> q' wraps the paragraph into a blockquote", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "> q");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("blockquote");
  expect(editor.view.state.doc.textContent).toBe("q");
  editor.destroy();
});

test("typing '``` ' creates an empty code block", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "``` ");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("code_block");
  expect(editor.view.state.doc.firstChild?.attrs.params).toBe("");
  editor.destroy();
});

test("typing '```ts ' creates a code block with params='ts'", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "```ts ");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("code_block");
  expect(editor.view.state.doc.firstChild?.attrs.params).toBe("ts");
  editor.destroy();
});

test("typing '---' then Enter creates a horizontal_rule", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "---");
  pressKey(editor.view, "Enter");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("horizontal_rule");
  expect(editor.view.state.doc.lastChild?.type.name).toBe("paragraph");
  editor.destroy();
});

test("Enter on a paragraph that isn't exactly '---' does NOT make a hr", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "----");
  pressKey(editor.view, "Enter");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("paragraph");
  editor.destroy();
});

test("Enter on '---' inside a list item does NOT make a hr", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "- ");
  typeText(editor.view, "---");
  pressKey(editor.view, "Enter");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("bullet_list");
  editor.destroy();
});

test("typing inside a code block does NOT trigger rules", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "``` ");
  typeText(editor.view, "# not a heading");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("code_block");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("# not a heading");
  editor.destroy();
});

test("typing '> ' mid-paragraph does NOT trigger blockquote rule", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "hello > world");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("paragraph");
  editor.destroy();
});

test("Shift-Tab lifts a nested list item back up", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "- a");
  pressKey(editor.view, "Enter");
  typeText(editor.view, "b");
  pressKey(editor.view, "Tab");
  pressKey(editor.view, "Shift-Tab");
  expect(editor.view.state.doc.firstChild?.childCount).toBe(2);
  editor.destroy();
});
