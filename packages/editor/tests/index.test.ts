import { expect, test } from "vite-plus/test";
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import { TextSelection } from "prosemirror-state";
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

test("typing '**bold**' converts the Marked Text to strong", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "**bold**");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("bold");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["strong"]);
  expect(editor.getMarkdown()).toBe("**bold**");
  editor.destroy();
});

test("typing '__bold__' converts the Marked Text to strong", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "__bold__");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("bold");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["strong"]);
  expect(editor.getMarkdown()).toBe("**bold**");
  editor.destroy();
});

test("typing '_em_' converts the Marked Text to emphasis", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "_em_");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("em");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["em"]);
  expect(editor.getMarkdown()).toBe("*em*");
  editor.destroy();
});

test("typing '*em*' converts the Marked Text to emphasis", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "*em*");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("em");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["em"]);
  expect(editor.getMarkdown()).toBe("*em*");
  editor.destroy();
});

test("typing '`code`' converts the Marked Text to inline code", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "`code`");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("code");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["code"]);
  expect(editor.getMarkdown()).toBe("`code`");
  editor.destroy();
});

test("typing '[text](https://example.com)' converts the Marked Text to a link", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "[text](https://example.com)");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("text");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["link"]);
  expect(paragraph.firstChild?.marks[0]?.attrs.href).toBe("https://example.com");
  expect(editor.getMarkdown()).toBe("[text](https://example.com)");
  editor.destroy();
});

test("typing '[' before existing 'text](url)' retroactively converts to a link", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "text](https://example.com)");
  const { view } = editor;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)));
  typeText(view, "[");
  const paragraph = view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("text");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["link"]);
  expect(paragraph.firstChild?.marks[0]?.attrs.href).toBe("https://example.com");
  expect(editor.getMarkdown()).toBe("[text](https://example.com)");
  editor.destroy();
});

test("typing '[text](/relative/path)' converts a relative Link Destination", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "[text](/relative/path)");
  expect(editor.view.state.doc.firstChild?.firstChild?.marks[0]?.attrs.href).toBe("/relative/path");
  expect(editor.getMarkdown()).toBe("[text](/relative/path)");
  editor.destroy();
});

test("typing '[text](#anchor)' converts an anchor Link Destination", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "[text](#anchor)");
  expect(editor.view.state.doc.firstChild?.firstChild?.marks[0]?.attrs.href).toBe("#anchor");
  expect(editor.getMarkdown()).toBe("[text](#anchor)");
  editor.destroy();
});

test("typing '[text](mailto:a@b.com)' converts a mailto Link Destination", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "[text](mailto:a@b.com)");
  expect(editor.view.state.doc.firstChild?.firstChild?.marks[0]?.attrs.href).toBe("mailto:a@b.com");
  expect(editor.getMarkdown()).toBe("[text](mailto:a@b.com)");
  editor.destroy();
});

test("single-character content converts for every inline mark", () => {
  const cases: { input: string; mark: string | string[]; text: string }[] = [
    { input: "**b**", mark: ["strong"], text: "b" },
    { input: "__b__", mark: ["strong"], text: "b" },
    { input: "*b*", mark: ["em"], text: "b" },
    { input: "_b_", mark: ["em"], text: "b" },
    { input: "`b`", mark: ["code"], text: "b" },
    { input: "***b***", mark: ["em", "strong"], text: "b" },
    { input: "___b___", mark: ["em", "strong"], text: "b" },
  ];
  for (const c of cases) {
    const mount = document.createElement("div");
    const editor = createEditor({ mount });
    typeText(editor.view, c.input);
    const paragraph = editor.view.state.doc.firstChild!;
    expect(paragraph.textContent).toBe(c.text);
    expect(paragraph.firstChild?.marks.map((m) => m.type.name)).toEqual(c.mark);
    editor.destroy();
  }
});

test("Backspace immediately after strong conversion restores the literal Markdown syntax", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "**bold**");
  pressKey(editor.view, "Backspace");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("**bold**");
  editor.destroy();
});

test("typing '** bold **' keeps delimiter-adjacent whitespace literal", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "** bold **");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("** bold **");
  editor.destroy();
});

test("typing 'foo_bar_baz' does NOT convert underscore syntax inside a word", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "foo_bar_baz");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("foo_bar_baz");
  editor.destroy();
});

test("typing 'foo__bar__baz' does NOT convert double-underscore strong inside a word", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "foo__bar__baz");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("foo__bar__baz");
  editor.destroy();
});

test("typing '_em_' at a word boundary still converts to emphasis", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "hello _em_");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("hello em");
  const emNode = paragraph.lastChild;
  expect(emNode?.marks.map((m) => m.type.name)).toEqual(["em"]);
  editor.destroy();
});

test("typing '**bold**!' continues with plain text after the strong mark", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "**bold**!");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("bold!");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["strong"]);
  expect(paragraph.lastChild?.marks).toEqual([]);
  editor.destroy();
});

test("typing '***both***' converts to a Combined Inline Markdown Mark", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "***both***");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("both");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["em", "strong"]);
  expect(editor.getMarkdown()).toBe("***both***");
  editor.destroy();
});

test("typing '___both___' converts to a Combined Inline Markdown Mark when not inside a word", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "___both___");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("both");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["em", "strong"]);
  editor.destroy();
});

test("typing '**_both_**' converts nested syntax to a Combined Inline Markdown Mark", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "**_both_**");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("both");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["em", "strong"]);
  expect(editor.getMarkdown()).toBe("***both***");
  editor.destroy();
});

test("typing '`**not bold**`' keeps Markdown-looking text inside inline code literal", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "`**not bold**`");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("**not bold**");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["code"]);
  editor.destroy();
});

test("typing '*__bold__*' wraps already-converted strong text in emphasis", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "*__bold__*");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("bold");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["em", "strong"]);
  editor.destroy();
});

test("typing '__*both*__' converts nested syntax to a Combined Inline Markdown Mark", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "__*both*__");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("both");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["em", "strong"]);
  editor.destroy();
});

test("typing '**`code`**' wraps inline code in a strong mark", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "**`code`**");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("code");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["strong", "code"]);
  expect(editor.getMarkdown()).toBe("**`code`**");
  editor.destroy();
});

test("typing '[**bold**](https://example.com)' converts rich link text", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "[**bold**](https://example.com)");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("bold");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["strong", "link"]);
  expect(paragraph.firstChild?.marks[1]?.attrs.href).toBe("https://example.com");
  expect(editor.getMarkdown()).toBe("[**bold**](https://example.com)");
  editor.destroy();
});

test("typing '[`code`](https://example.com)' converts rich link text with inline code", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "[`code`](https://example.com)");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("code");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["link", "code"]);
  expect(paragraph.firstChild?.marks[0]?.attrs.href).toBe("https://example.com");
  editor.destroy();
});

test("typing '[**_both_**](https://example.com)' converts rich link text with combined marks", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "[**_both_**](https://example.com)");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("both");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual([
    "em",
    "strong",
    "link",
  ]);
  expect(paragraph.firstChild?.marks[2]?.attrs.href).toBe("https://example.com");
  editor.destroy();
});

test("typing '[*em*](https://example.com)' converts rich link text with emphasis", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "[*em*](https://example.com)");
  const paragraph = editor.view.state.doc.firstChild!;
  expect(paragraph.textContent).toBe("em");
  expect(paragraph.firstChild?.marks.map((mark) => mark.type.name)).toEqual(["em", "link"]);
  expect(paragraph.firstChild?.marks[1]?.attrs.href).toBe("https://example.com");
  editor.destroy();
});

test("typing '\\**not bold**' keeps an Escaped Inline Markdown Mark literal", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "\\**not bold**");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("\\**not bold**");
  editor.destroy();
});

test("typing '\\`not code\\`' keeps escaped inline code literal", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "\\`not code\\`");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("\\`not code\\`");
  editor.destroy();
});

test("typing '\\[not link](x)' keeps escaped link syntax literal", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "\\[not link](x)");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("\\[not link](x)");
  editor.destroy();
});

test("typing inline Markdown inside a heading converts within the current text block", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "# ");
  typeText(editor.view, "**bold**");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("heading");
  expect(editor.view.state.doc.firstChild?.firstChild?.marks.map((mark) => mark.type.name)).toEqual(
    ["strong"],
  );
  expect(editor.getMarkdown()).toBe("# **bold**");
  editor.destroy();
});

test("typing inline Markdown inside a list item converts within the current text block", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "- ");
  typeText(editor.view, "**bold**");
  const text = editor.view.state.doc.firstChild?.firstChild?.firstChild?.firstChild;
  expect(text?.marks.map((mark) => mark.type.name)).toEqual(["strong"]);
  expect(editor.getMarkdown()).toBe("* **bold**");
  editor.destroy();
});

test("typing inline Markdown inside a blockquote converts within the current text block", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "> ");
  typeText(editor.view, "**bold**");
  const text = editor.view.state.doc.firstChild?.firstChild?.firstChild;
  expect(text?.marks.map((mark) => mark.type.name)).toEqual(["strong"]);
  expect(editor.getMarkdown()).toBe("> **bold**");
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

test("typing '**bold**' inside a code block does NOT convert inline Markdown", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  typeText(editor.view, "``` ");
  typeText(editor.view, "**bold**");
  expect(editor.view.state.doc.firstChild?.type.name).toBe("code_block");
  expect(editor.view.state.doc.firstChild?.textContent).toBe("**bold**");
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
