import { expect, test } from "vite-plus/test";
import { filterCandidates, lookupShortcode } from "../src/features/emoji-catalog.ts";
import { createEditor, setSpecMarkdown } from "../src/index.ts";

test("lookupShortcode returns entry for known shortcode", () => {
  const entry = lookupShortcode("book");
  expect(entry).not.toBeNull();
  expect(entry?.shortcode).toBe("book");
  expect(entry?.emoji).toBe("📖");
});

test("lookupShortcode returns null for unknown shortcode", () => {
  expect(lookupShortcode("not_real")).toBeNull();
});

test("filterCandidates returns matches containing query", () => {
  const results = filterCandidates("boo");
  expect(results.some((e) => e.shortcode === "book")).toBe(true);
});

test("filterCandidates returns empty for no matches", () => {
  const results = filterCandidates("zzznomatch");
  expect(results).toHaveLength(0);
});

test("emoji markdown round-trip serializes to shortcode", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: ":book: hello" });
  expect(editor.getMarkdown()).toBe(":book: hello");
  editor.destroy();
});

test("unknown shortcode stays as plain text", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: ":not_real:" });
  expect(editor.getMarkdown()).toBe(":not_real:");
  editor.destroy();
});

test("emoji node re-enters source projection on cursor entry", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  setSpecMarkdown(editor.view, ":book:");
  expect(editor.getMarkdown()).toBe(":book:");
  editor.destroy();
});
