# Live block-level markdown via mixed input mechanisms

To get Typora-style live conversion of block-level markdown into schema nodes, we adopt a **mix** of ProseMirror mechanisms rather than a single uniform one. Each mechanism is chosen for the trigger semantics it can express, not for stylistic consistency.

## The mix

| Syntax                                       | Mechanism                                                                     | Trigger                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| `# `..`###### `, `- `/`* `/`+ `, `1. `, `> ` | `prosemirror-inputrules` (`textblockTypeInputRule` / `wrappingInputRule`)     | trailing space                                   |
| ` ```lang? `                                 | `prosemirror-inputrules` with regex `/^```([a-zA-Z0-9]*)\s$/`                 | trailing space, optional language capture        |
| `---`                                        | Custom Enter keymap entry, runs before `splitListItem` and `baseKeymap`       | Enter, only when paragraph text is exactly `---` |
| Pasted markdown                              | `EditorProps.clipboardTextParser` delegating to `defaultMarkdownParser.parse` | paste event                                      |
| Backspace right after a rule fires           | `undoInputRule` bound on Backspace, before `baseKeymap`                       | one-shot undo window                             |

## Why not unify

- **`---` cannot ride on `inputrules`.** Input rules fire per text input. `---` is ambiguous with literal-text intent (separator templates, todo headers, future setext-heading support) and matches Typora's "wait for Enter" disambiguation. An Enter handler is the only mechanism that can wait for that structural signal.
- **` ``` ` rides on inputrules deliberately, despite Typora's deviation.** Typora swaps to a language-picker overlay UI on the third backtick. That overlay is a separate scope of work (positioning, fuzzy list, keyboard nav, focus coordination with PM). The schema product is identical to ours (`code_block` with `params`), so the picker can be added later as a pure view-layer enhancement without changing this ADR.
- **Paste is its own input channel.** `inputrules` ignores paste by design. Leaving paste as plain text creates a "sometimes converts, sometimes doesn't" feel; the cheap fix is reusing the same `defaultMarkdownParser` we already use for `setMarkdown`.

## Considered and rejected

- **Trigger on the third character for `---` and ` ``` `** (no trailing space, no Enter): rejected for `---` for the ambiguity reasons above. Accepted in spirit for ` ``` ` — we use trailing space rather than third backtick only so an optional language can be captured (` ```ts `).
- **Fire on Enter for everything**: rejected. Headings, lists, blockquote all have "prefix + content on the same line" intent — waiting for Enter would defer feedback past the moment the user has already committed to the structure.
- **Skip live conversion, parse only on save**: rejected. The project description is "Typora-style"; deferred conversion is a different product.

## Consequences

- Plugin order is load-bearing. `inputRules({...})` and the supplemental keymaps must register before `keymap(baseKeymap)` — otherwise `splitBlock` claims Enter first and the `---` handler never runs.
- `code_block.spec.code = true` (already true in `prosemirror-markdown`) auto-excludes input rules inside code blocks. We rely on this; do not strip it.
- `Mod-Shift-V` must be bound to paste-as-plain-text so users retain an escape hatch for pasting literal markdown source.
- A future "language picker for ` ``` `" task can replace the inline language capture without touching the rule's schema output.
