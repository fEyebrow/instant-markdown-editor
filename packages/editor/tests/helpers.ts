import type { EditorView } from "prosemirror-view";
import { applyAction } from "../src/specs/runner.ts";

export function typeText(view: EditorView, text: string): void {
  for (const ch of text) applyAction(view, ch);
}

export function pressKey(view: EditorView, chord: string): void {
  applyAction(view, chord);
}
