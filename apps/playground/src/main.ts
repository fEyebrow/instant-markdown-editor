import "@rte/editor/style.css";
import "./style.css";
import { createEditor, type EditorHandle } from "@rte/editor";
import { TextSelection } from "prosemirror-state";
import { renderSpecs } from "./specs.ts";

const initial = `# packages/editor playground

\`packages/editor\` is a ProseMirror-based, Typora-style WYSIWYG markdown editor. This playground is a manual surface for trying out its parser, serializer, and live editing behavior.

Press Cmd+/ (or Ctrl+/) to toggle the markdown source view.

## Inline syntax

Mix *italic*, **bold**, ~~strikethrough~~, H~2~O subscript, E=mc^2^ superscript, ==highlight==, \`inline code\`, a [labelled link](https://prosemirror.net), and an autolink like <https://github.com> all in one paragraph.

## Block syntax

> Blockquotes wrap any paragraph in a quoted callout.

---

1. Ordered list item one
2. Ordered list item two
3. Ordered list item three

- Unordered list item one
- Unordered list item two
- Unordered list item three
`;

type ViewMode = "wysiwyg" | "source";
type EditorDoc = EditorHandle["view"]["state"]["doc"];

interface PlaygroundState {
  editor: EditorHandle;
  editorMount: HTMLElement;
  textarea: HTMLTextAreaElement;
  view: ViewMode;
  lastEditorScrollTop: number;
  lastSourceScrollTop: number;
}

let toggleListener: ((event: KeyboardEvent) => void) | null = null;

const app = document.querySelector<HTMLElement>("#app")!;

if (window.location.pathname === "/specs") {
  renderSpecs(app);
} else {
  renderEditor(app);
}

function renderEditor(root: HTMLElement): void {
  root.innerHTML = `
    <div class="shell shell-soft">
      ${renderTopbar("editor")}
      <main class="page-wrap">
        <section class="editor-card">
          <div id="editor"></div>
          <textarea id="source" class="source-textarea" hidden spellcheck="false"></textarea>
        </section>
      </main>
    </div>
  `;

  const editorMount = root.querySelector<HTMLElement>("#editor")!;
  const textarea = root.querySelector<HTMLTextAreaElement>("#source")!;

  const editor = createEditor({
    mount: editorMount,
    initialMarkdown: initial,
  });

  const state: PlaygroundState = {
    editor,
    editorMount,
    textarea,
    view: "wysiwyg",
    lastEditorScrollTop: 0,
    lastSourceScrollTop: 0,
  };

  if (toggleListener) window.removeEventListener("keydown", toggleListener, true);
  toggleListener = (event) => {
    if (event.isComposing) return;
    if (!isToggleChord(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (state.view === "wysiwyg") enterSource(state);
    else enterWysiwyg(state);
  };
  window.addEventListener("keydown", toggleListener, true);
}

function isToggleChord(event: KeyboardEvent): boolean {
  if (event.key !== "/") return false;
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  return isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

function enterSource(state: PlaygroundState): void {
  const { editor, editorMount, textarea } = state;
  const markdown = editor.getMarkdown();
  textarea.value = markdown;

  const docOffset = editor.view.state.doc.textBetween(
    0,
    editor.view.state.selection.from,
    "\n",
  ).length;
  const cursor = Math.min(docOffset, markdown.length);

  state.lastEditorScrollTop = editorMount.scrollTop;

  editorMount.hidden = true;
  textarea.hidden = false;

  textarea.focus();
  textarea.setSelectionRange(cursor, cursor);
  textarea.scrollTop = state.lastSourceScrollTop;
  state.view = "source";
}

function enterWysiwyg(state: PlaygroundState): void {
  const { editor, editorMount, textarea } = state;
  const targetOffset = textarea.selectionStart;
  state.lastSourceScrollTop = textarea.scrollTop;

  editor.setMarkdown(textarea.value);

  textarea.hidden = true;
  editorMount.hidden = false;

  const view = editor.view;
  const docPos = textOffsetToDocPos(view.state.doc, targetOffset);
  const $pos = view.state.doc.resolve(docPos);
  view.dispatch(view.state.tr.setSelection(TextSelection.near($pos)));

  view.focus();
  editorMount.scrollTop = state.lastEditorScrollTop;
  state.view = "wysiwyg";
}

function textOffsetToDocPos(doc: EditorDoc, targetOffset: number): number {
  let accumulated = 0;
  let result: number | null = null;
  doc.descendants((node, pos) => {
    if (result !== null) return false;
    if (!node.isText) return true;
    const length = node.text?.length ?? 0;
    if (accumulated + length >= targetOffset) {
      result = pos + (targetOffset - accumulated);
    } else {
      accumulated += length;
    }
    return true;
  });
  return Math.min(result ?? doc.content.size, doc.content.size);
}

function renderTopbar(active: "editor" | "specs"): string {
  return `
    <header class="topbar topbar-minimal">
      <div class="brandrow">
        <a class="brandmark" href="/">Typora</a>
        <nav class="topnav topnav-minimal" aria-label="Sections">
          <a class="navlink navlink-minimal${active === "editor" ? " active" : ""}" href="/">Editor</a>
          <a class="navlink navlink-minimal${active === "specs" ? " active" : ""}" href="/specs">Specs</a>
        </nav>
      </div>
    </header>
  `;
}
