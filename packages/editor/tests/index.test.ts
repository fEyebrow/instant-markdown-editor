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
