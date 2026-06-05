# @rte/editor

ProseMirror-based Typora-style WYSIWYG Markdown editor.

## Usage

```ts
import { createEditor } from "@rte/editor";
import "@rte/editor/style.css";

const editor = createEditor({
  mount: document.querySelector("#editor")!,
  initialMarkdown: "# Hello",
  onChange(markdown) {
    console.log(markdown);
  },
});
```

The root package entry exposes the runtime editor interface only. Spec runner helpers are available from `@rte/editor/specs` for playground and behavior-test tooling.
