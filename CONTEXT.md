# Rich Text Editor

This context defines the product language for a Typora-style Markdown rich text editor.

## Language

**Block Markdown Shortcut**:
A Markdown prefix or delimiter that turns a whole text block into a structured block while the user is typing.
_Avoid_: block rule, block conversion

**Inline Markdown Mark**:
A Markdown delimiter pair that turns enclosed inline text into an existing rich-text mark while the user is typing.
_Avoid_: inline tag, markdown annotation, inline conversion

**Combined Inline Markdown Mark**:
Nested or compound Markdown delimiters that apply more than one rich-text mark to the same **Marked Text**.
_Avoid_: combined tag, mixed markdown

**Marked Text**:
The non-blank inline text enclosed by an **Inline Markdown Mark**.
_Avoid_: marked content, inner text

**Link Destination**:
The plain URL or anchor target attached to link text.
_Avoid_: href text, link URL markdown

**Escaped Inline Markdown Mark**:
An **Inline Markdown Mark** preceded by a backslash to keep the typed Markdown literal.
_Avoid_: disabled mark, literal syntax mode

## Relationships

- An **Inline Markdown Mark** affects text inside a block.
- A **Block Markdown Shortcut** affects the block that contains the cursor.
- An **Inline Markdown Mark** encloses **Marked Text**.
- A **Combined Inline Markdown Mark** applies multiple marks to the same **Marked Text**.
- An **Escaped Inline Markdown Mark** remains literal text.
- Link text may contain other **Inline Markdown Marks**.

## Example dialogue

> **Dev:** "Should `**bold**` create a new node?"
> **Domain expert:** "No — `**bold**` is an **Inline Markdown Mark** because it marks text inside the current block."
> **Dev:** "Should `***important***` be treated as one style or two?"
> **Domain expert:** "It is a **Combined Inline Markdown Mark** because the same text is both strong and emphasized."

## Flagged ambiguities

- "inline markup" was used broadly — resolved: the canonical term is **Inline Markdown Mark**, limited initially to bold, emphasis, inline code, and links.
- Combined inline syntax can be written as compound delimiters or nested delimiters — resolved: **Combined Inline Markdown Mark** includes both forms.
