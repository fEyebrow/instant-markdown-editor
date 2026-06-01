import { expect, test } from "vite-plus/test";
import { createEditor, setSpecMarkdown } from "../src/index.ts";

test("clicking task checkbox toggles checked state", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "- [ ] todo" });

  const checkbox = mount.querySelector("input.md-task-checkbox") as HTMLInputElement;
  expect(checkbox).toBeTruthy();
  expect(checkbox.checked).toBe(false);

  checkbox.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

  expect(editor.getMarkdown()).toBe("* [x] todo");

  const checkboxAfter = mount.querySelector("input.md-task-checkbox") as HTMLInputElement;
  expect(checkboxAfter.checked).toBe(true);

  editor.destroy();
});

test("clicking checked checkbox toggles to unchecked", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount, initialMarkdown: "- [x] done" });

  const checkbox = mount.querySelector("input.md-task-checkbox") as HTMLInputElement;
  expect(checkbox.checked).toBe(true);

  checkbox.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

  expect(editor.getMarkdown()).toBe("* [ ] done");
  editor.destroy();
});

test("serializing task list preserves checked state", () => {
  const mount = document.createElement("div");
  const editor = createEditor({ mount });
  setSpecMarkdown(editor.view, "- [ ] todo\n- [x] done");

  expect(editor.getMarkdown()).toBe("* [ ] todo\n* [x] done");
  editor.destroy();
});
