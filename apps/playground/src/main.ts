import "@rte/editor/style.css";
import "./style.css";
import { createEditor } from "@rte/editor";

const initial = `# Hello, ProseMirror

This is a **Typora-style** markdown editor playground built on \`prosemirror-markdown\`.

- bullet one
- bullet two

> Quote block

---

\`\`\`ts
const x: number = 42;
\`\`\`
`;

const mount = document.querySelector<HTMLElement>("#editor")!;
const source = document.querySelector<HTMLElement>("#source")!;

const editor = createEditor({
  mount,
  initialMarkdown: initial,
  onChange: (md) => {
    source.textContent = md;
  },
});

source.textContent = editor.getMarkdown();
