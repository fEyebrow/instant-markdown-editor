import type { EditorView } from "prosemirror-view";

export function typeText(view: EditorView, text: string): void {
  for (const ch of text) {
    const { from, to } = view.state.selection;
    const defaultTr = view.state.tr.insertText(ch, from, to);
    const handled = view.someProp("handleTextInput", (f) => f(view, from, to, ch, () => defaultTr));
    if (!handled) {
      view.dispatch(defaultTr);
    }
  }
}

export function pressKey(
  view: EditorView,
  key: string,
  modifiers: { shift?: boolean; ctrl?: boolean; meta?: boolean } = {},
): boolean {
  const event = new KeyboardEvent("keydown", {
    key,
    shiftKey: modifiers.shift ?? false,
    ctrlKey: modifiers.ctrl ?? false,
    metaKey: modifiers.meta ?? false,
  });
  return view.someProp("handleKeyDown", (f) => f(view, event)) ?? false;
}
