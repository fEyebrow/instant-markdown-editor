import "instant-markdown-editor/style.css";
import "./style.css";
import { createEditor, type EditorHandle } from "instant-markdown-editor";
import { TextSelection } from "prosemirror-state";
import { isSpecsPath } from "./routes.ts";
import { renderSpecs } from "./specs.ts";
import { renderTopbar } from "./topbar.ts";

const initial = `# packages/editor playground

\`packages/editor\` is a ProseMirror-based, Typora-style WYSIWYG Markdown editor. This playground lets you try the editing model before reading the implementation.

Press Cmd+/ (or Ctrl+/) to compare the rendered editor with retained Markdown source.

## Inline syntax

Mix *italic*, **bold**, ~~strikethrough~~, H~2~O subscript, E=mc^2^ superscript, ==highlight==, \`inline code\`, a [labelled link](https://prosemirror.net), and an autolink like <https://github.com> all in one paragraph.

Here is an inline image: ![GitHub avatar](https://avatars.githubusercontent.com/u/18180417?v=4)

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

type Route = "editor" | "specs";

let currentRoute: Route | null = null;
let cleanupRoute: (() => void) | null = null;

renderRoute();
window.addEventListener("hashchange", renderRoute);

function renderRoute(): void {
  const route: Route = isSpecsPath(window.location.hash) ? "specs" : "editor";
  if (route === currentRoute) return;

  cleanupRoute?.();
  cleanupRoute = null;
  currentRoute = route;

  if (route === "specs") {
    renderSpecs(app);
  } else {
    cleanupRoute = renderEditor(app);
  }
}

function renderEditor(root: HTMLElement): () => void {
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
  textarea.addEventListener("input", autosizeTextarea);

  return () => {
    if (toggleListener) {
      window.removeEventListener("keydown", toggleListener, true);
      toggleListener = null;
    }
    textarea.removeEventListener("input", autosizeTextarea);
    editor.destroy();
  };
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
  autosizeTextarea({ currentTarget: textarea });

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

function autosizeTextarea(event: Pick<Event, "currentTarget">): void {
  const textarea = event.currentTarget;
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
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
