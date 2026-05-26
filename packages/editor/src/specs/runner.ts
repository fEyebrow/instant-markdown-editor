import type { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { EditorHandle } from "../index.ts";
import { markdownParser } from "../markdown/parser.ts";

export interface Chord {
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

const NAMED_KEYS = new Set([
  "Enter",
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Space",
]);

export function applyAction(view: EditorView, token: string): void {
  if (token.length === 1) {
    typeChar(view, token);
    return;
  }
  if (!token.includes("-") && !NAMED_KEYS.has(token)) {
    throw new Error(`Unknown spec action token: ${JSON.stringify(token)}`);
  }
  pressChord(view, parseChord(token));
}

export function applyActions(view: EditorView, tokens: readonly string[]): void {
  for (const token of tokens) applyAction(view, token);
}

export function parseChord(token: string): Chord {
  const parts = token.split("-");
  const key = parts.pop()!;
  const chord: Chord = { key, shift: false, ctrl: false, alt: false, meta: false };
  for (const part of parts) {
    if (part === "Shift") chord.shift = true;
    else if (part === "Alt") chord.alt = true;
    else if (part === "Ctrl") chord.ctrl = true;
    else if (part === "Meta" || part === "Cmd") chord.meta = true;
    else if (part === "Mod") {
      if (isMac()) chord.meta = true;
      else chord.ctrl = true;
    } else throw new Error(`Unknown modifier in chord ${JSON.stringify(token)}: ${part}`);
  }
  return chord;
}

function typeChar(view: EditorView, ch: string): void {
  const { from, to } = view.state.selection;
  const fallback = view.state.tr.insertText(ch, from, to);
  const handled = view.someProp("handleTextInput", (f) => f(view, from, to, ch, () => fallback));
  if (!handled) view.dispatch(fallback);
}

function pressChord(view: EditorView, chord: Chord): void {
  const event = new KeyboardEvent("keydown", {
    key: chord.key === "Space" ? " " : chord.key,
    shiftKey: chord.shift,
    ctrlKey: chord.ctrl,
    altKey: chord.alt,
    metaKey: chord.meta,
  });
  const handled = view.someProp("handleKeyDown", (f) => f(view, event));
  if (!handled) applySelectionKey(view, chord);
}

export function setMarkdownWithCursor(view: EditorView, markdown: string): void {
  const markerIndex = markdown.indexOf("|");
  if (markerIndex === -1) {
    setMarkdown(view, markdown, null);
    return;
  }
  if (markerIndex !== markdown.lastIndexOf("|")) {
    throw new Error(`Initial spec markdown must contain at most one cursor marker: ${markdown}`);
  }

  const beforeCursor = markdown.slice(0, markerIndex);
  const markdownWithoutCursor = markdown.slice(0, markerIndex) + markdown.slice(markerIndex + 1);
  const cursorOffset = markdownParser.parse(beforeCursor).textContent.length;
  setMarkdown(view, markdownWithoutCursor, cursorOffset);
}

function setMarkdown(view: EditorView, markdown: string, cursorOffset: number | null): void {
  const doc = markdownParser.parse(markdown);
  const { schema } = view.state;
  const position =
    cursorOffset === null ? endOfLastTextblock(doc) : textOffsetToPosition(doc, cursorOffset);

  const next = EditorState.create({
    doc,
    schema,
    plugins: view.state.plugins,
    selection: TextSelection.create(doc, position),
  });
  view.updateState(next);
}

function textOffsetToPosition(doc: ProseMirrorNode, textOffset: number): number {
  let pos = -1;
  let count = 0;
  doc.descendants((node, p) => {
    if (pos !== -1) return false;
    if (node.isText) {
      const len = (node.text ?? "").length;
      if (count + len >= textOffset) {
        pos = p + (textOffset - count);
        return false;
      }
      count += len;
    }
    return true;
  });
  if (pos !== -1) return pos;
  let firstTextblock = -1;
  doc.descendants((node, p) => {
    if (firstTextblock !== -1) return false;
    if (node.isTextblock) {
      firstTextblock = p + 1;
      return false;
    }
    return true;
  });
  return firstTextblock === -1 ? 0 : firstTextblock;
}

function endOfLastTextblock(doc: ProseMirrorNode): number {
  let pos = -1;
  doc.descendants((node, p) => {
    if (node.isTextblock) pos = p + 1 + node.content.size;
    return true;
  });
  return pos === -1 ? 0 : pos;
}

function applySelectionKey(view: EditorView, chord: Chord): void {
  if (chord.shift || chord.ctrl || chord.alt || chord.meta) return;
  const { selection, doc } = view.state;
  if (!selection.empty) return;

  if (chord.key === "ArrowLeft" || chord.key === "ArrowRight") {
    const delta = chord.key === "ArrowLeft" ? -1 : 1;
    const position = selection.from + delta;
    if (position < 1 || position > doc.content.size) return;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, position)));
    return;
  }

  if (chord.key === "ArrowUp" || chord.key === "ArrowDown") {
    const target = adjacentTextblockPosition(doc, selection.from, chord.key === "ArrowDown");
    if (target === null) return;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, target)));
  }
}

function adjacentTextblockPosition(
  doc: ProseMirrorNode,
  from: number,
  forward: boolean,
): number | null {
  const $from = doc.resolve(from);
  const currentIndex = $from.depth >= 1 ? $from.index(0) : -1;
  let offset = 0;
  let target: number | null = null;
  for (let i = 0; i < doc.childCount; i += 1) {
    const child = doc.child(i);
    if (child.isTextblock) {
      if (forward && i > currentIndex) {
        target = offset + 1;
        break;
      }
      if (!forward && i < currentIndex) {
        target = offset + 1 + child.content.size;
      }
    }
    offset += child.nodeSize;
  }
  return target;
}

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iP(hone|[oa]d)/.test(navigator.platform);
}

type TagSerializer = (content: string, el: HTMLElement) => string;

const DEFAULT_TAGS: Record<string, TagSerializer> = {
  P: (c) => `<p>${c}</p>`,
  BLOCKQUOTE: (c) => `<blockquote>${c}</blockquote>`,
  H1: (c) => `<h1>${c}</h1>`,
  H2: (c) => `<h2>${c}</h2>`,
  H3: (c) => `<h3>${c}</h3>`,
  H4: (c) => `<h4>${c}</h4>`,
  H5: (c) => `<h5>${c}</h5>`,
  H6: (c) => `<h6>${c}</h6>`,
  PRE: (c, el) => {
    const params = el.getAttribute("data-params");
    return params ? `<pre data-params="${escapeAttribute(params)}">${c}</pre>` : `<pre>${c}</pre>`;
  },
  CODE: (c) => `<code>${c}</code>`,
  OL: (c, el) => {
    const start = el.getAttribute("start");
    return start ? `<ol start="${escapeAttribute(start)}">${c}</ol>` : `<ol>${c}</ol>`;
  },
  UL: (c) => `<ul>${c}</ul>`,
  LI: (c) => `<li>${c}</li>`,
  DIV: (c, el) => {
    if (el.childNodes.length === 1 && el.firstElementChild?.tagName === "HR") return "<hr>";
    return c;
  },
  HR: () => "<hr>",
  EM: (c) => `<i>${c}</i>`,
  I: (c) => `<i>${c}</i>`,
  STRONG: (c) => `<b>${c}</b>`,
  B: (c) => `<b>${c}</b>`,
  S: (c) => `<s>${c}</s>`,
  DEL: (c) => `<s>${c}</s>`,
  STRIKE: (c) => `<s>${c}</s>`,
  A: (c, el) => {
    const href = el.getAttribute("href");
    const title = el.getAttribute("title");
    const attrs = [
      href ? ` href="${escapeAttribute(href)}"` : "",
      title ? ` title="${escapeAttribute(title)}"` : "",
    ].join("");
    return `<a${attrs}>${c}</a>`;
  },
  IMG: (_c, el) => {
    const src = el.getAttribute("src") ?? "";
    const alt = el.getAttribute("alt");
    const title = el.getAttribute("title");
    const attrs = [
      `src="${escapeAttribute(src)}"`,
      alt === null ? "" : ` alt="${escapeAttribute(alt)}"`,
      title === null ? "" : ` title="${escapeAttribute(title)}"`,
    ].filter(Boolean);
    return `<img ${attrs.join(" ")}>`;
  },
  BR: () => "<br>",
};

export interface ProjectionOptions {
  tags?: Record<string, TagSerializer>;
}

export function projectEditorView(editor: EditorHandle, options: ProjectionOptions = {}): string {
  const tags = { ...DEFAULT_TAGS, ...options.tags };
  const viewRoot = editor.view.dom;
  const cursor = editor.view.domAtPos(editor.view.state.selection.from);
  return serializeNode(viewRoot, cursor, tags) || "|";
}

function serializeNode(
  node: Node,
  cursor: { node: Node; offset: number },
  tags: Record<string, TagSerializer>,
): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeText(node.textContent ?? "");
    if (node === cursor.node) {
      return `${text.slice(0, cursor.offset)}|${text.slice(cursor.offset)}`;
    }
    return text;
  }

  if (!(node instanceof HTMLElement)) return "";

  if (node.tagName === "BR" && node.classList.contains("ProseMirror-trailingBreak")) return "";

  const children = Array.from(node.childNodes);
  const parts: string[] = [];

  if (node === cursor.node && cursor.offset === 0) parts.push("|");
  children.forEach((child, index) => {
    parts.push(serializeNode(child, cursor, tags));
    if (node === cursor.node && cursor.offset === index + 1) parts.push("|");
  });

  const content = parts.join("");

  if (node.classList.contains("ProseMirror")) return content;
  if (node.classList.contains("md-pending")) return `<pending>${content}</pending>`;
  if (node.classList.contains("md-block-pending"))
    return `<block-pending>${content}</block-pending>`;
  if (node.classList.contains("md-block-pending-content")) return `<strong>${content}</strong>`;
  if (node.classList.contains("md-live-em")) return `<i>${content}</i>`;
  if (node.classList.contains("md-live-strong")) return `<b>${content}</b>`;
  if (node.classList.contains("md-live-strikethrough")) return `<s>${content}</s>`;
  if (node.classList.contains("md-live-code")) return `<code>${content}</code>`;

  const serializer = tags[node.tagName];
  return serializer ? serializer(content, node) : content;
}

function normalizeText(value: string): string {
  return value.replaceAll("\u00a0", " ");
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}
