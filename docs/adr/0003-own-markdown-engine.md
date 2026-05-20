# Own markdown engine on top of markdown-it

The editor owns its markdown engine — schema, parser, and serializer all live in this repo — instead of depending on `prosemirror-markdown`. Tokenization is delegated to `markdown-it` in CommonMark mode (`MarkdownIt("commonmark", { html: false })`); everything above the token stream is hand-written and bound to the in-repo `Schema` instance.

## What this fixes

`prosemirror-markdown` couples three independent things behind one package: a CommonMark `Schema` literal, a `markdown-it` → PM tree converter, and a PM → CommonMark serializer. Coupling forces them to evolve together. In practice we needed to (a) reorder serializer mark output for stable round-trip, and (b) reach the schema and parser separately for live conversion. Both were possible only by reaching past the package's exported API into its class internals (`MarkdownSerializerState`), which then broke when the upstream renamed or reshaped those internals.

Owning the three pieces in this repo gives us a stable surface to extend without subclassing third-party state.

## The split

| Layer          | Location                                     | Source                                                           |
| -------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Schema literal | `packages/editor/src/schema/index.ts`        | Copied from pm-markdown 1.13.4, instantiated as our own `Schema` |
| Parser         | `packages/editor/src/markdown/parser.ts`     | Own token-stream → PM converter, ~250 LOC                        |
| Serializer     | `packages/editor/src/markdown/serializer.ts` | Own PM → markdown serializer, ~350 LOC                           |
| Tokenizer      | `markdown-it@14`                             | Direct dependency, CommonMark preset, `html: false`              |

`markdown-it` is kept as a dependency because the CommonMark spec is ~1000 LOC of edge cases (block continuation, lazy continuation, emphasis run-length parsing, link reference resolution) that we do not benefit from re-implementing. `prosemirror-markdown` was itself a thin shim over `markdown-it`; we kept the tokenizer and dropped the shim.

## Supported subset

The supported subset is **pure CommonMark, no extensions, no raw HTML**. Concretely the parser accepts what `MarkdownIt("commonmark", { html: false })` emits and our token map handles: paragraph, blockquote, ATX heading, setext heading, indented code block, fenced code block, bullet/ordered list (tight/loose), thematic break, image, hard break, em, strong, code, link.

Out of scope today: tables, strikethrough, task lists, math (`$x$`, `$$x$$`), front-matter, footnotes, raw HTML blocks/inline, autolinks beyond CommonMark's bare-URL form, image dimensions. Future extensions ride on `markdown-it` plugins plus new token-handler entries, not on bespoke parsing.

The serializer output dialect matches the parser subset: it emits ATX headings, fenced code blocks (backtick), `*em*`, `**strong**`, `` `code` ``, `[text](url "title")` with `()"` in URLs escaped, `![alt](src "title")` for images, `\ + newline` for hard breaks, `---` for thematic break. Mark order is stable: `link` outermost, then `strong`, `em`, `code` innermost.

## Considered and rejected

- **Hand-rolled CommonMark parser.** Would remove the `markdown-it` dependency at the cost of ~1000 LOC and a re-implementation of well-tested edge cases. Bad trade for a project whose value isn't in the parser.
- **Keep `prosemirror-markdown` as the parser only.** Possible (the serializer was the painful side), but the schema instance must match the parser. Splitting the dependency by surface area meant either two `Schema` instances or wrapping the upstream schema — both worse than owning both.
- **GFM / Typora extensions in v1.** Deferred. The migration's value is the architectural simplification; extension scope is a separate decision tracked in future ADRs.

## Consequences

- Adding a markdown feature is a two-step change: configure `markdown-it` (preset or plugin), then add a token-handler entry in `parser.ts` and a node/mark spec in `schema/index.ts` plus a serializer renderer.
- Round-trip is no longer self-asserting against an upstream baseline. The test suite (`packages/editor/tests/index.test.ts`) is the contract; new features must extend it with both directions.
- `markdown-it` is locked to CommonMark mode. Switching to `default` (which is GFM-ish) is an explicit decision, not a default.
