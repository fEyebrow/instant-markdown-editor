import type { Mark, MarkSpec } from "prosemirror-model";
import { markConsumed, type InlineFeatureSpec, type InlineSpan } from "./inline-parse.ts";
import type { FeatureSpec } from "./_types.ts";

const LINK_RE = /\[([^\]\n]*?)\]\(([^\s)\n]*)(?:\s+"([^"\n]*)")?\)/g;

const scan: InlineFeatureSpec["scan"] = (text, consumed) => {
  const out: InlineSpan[] = [];
  LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = LINK_RE.exec(text))) {
    const fullStart = match.index;
    const fullEnd = fullStart + match[0].length;
    if (fullStart > 0 && text[fullStart - 1] === "!") continue;

    const openFrom = fullStart;
    const openTo = fullStart + 1;
    const label = match[1]!;
    const href = match[2]!;
    const title = match[3] ?? null;
    const contentFrom = openTo;
    const contentTo = contentFrom + label.length;
    const closeFrom = contentTo;
    const closeTo = fullEnd;

    let blocked = false;
    for (let i = openFrom; i < openTo; i += 1) {
      if (consumed[i]) blocked = true;
    }
    for (let i = closeFrom; i < closeTo; i += 1) {
      if (consumed[i]) blocked = true;
    }
    if (blocked) continue;

    markConsumed(consumed, openFrom, openTo);
    markConsumed(consumed, closeFrom, closeTo);

    const span: InlineSpan = {
      type: "link",
      from: contentFrom,
      to: contentTo,
      openFrom,
      openTo,
      closeFrom,
      closeTo,
      attrs: { href, title },
    };

    if (label === "") {
      if (href === "" || title !== null) {
        span.delimRanges = [
          { from: openFrom, to: openTo, forceVisible: true },
          { from: closeFrom, to: closeTo, forceVisible: true },
        ];
      } else {
        const hrefFrom = closeFrom + 2;
        const hrefTo = closeTo - 1;
        span.delimRanges = [
          { from: openFrom, to: openTo, forceVisible: true },
          { from: closeFrom, to: hrefFrom, forceVisible: true },
          { from: hrefTo, to: closeTo, forceVisible: true },
        ];
      }
    }

    out.push(span);
  }

  return out;
};

function closeDelimText(mark: Mark): string {
  const href = String(mark.attrs.href ?? "");
  const title = mark.attrs.title as string | null;
  return title ? `](${href} "${title.replace(/"/g, '\\"')}")` : `](${href})`;
}

export const link: FeatureSpec = {
  name: "link",
  marks: {
    link: {
      attrs: {
        href: {},
        title: { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom) {
            const el = dom as HTMLElement;
            return { href: el.getAttribute("href"), title: el.getAttribute("title") };
          },
        },
      ],
      toDOM(mark) {
        const { href, title } = mark.attrs as { href: string; title: string | null };
        return ["a", title ? { href, title } : { href }, 0];
      },
    } as MarkSpec,
  },
  parserTokens: {
    link_open: (state, token, schema) => {
      if (token.markup === "autolink" && schema.marks.autolink) {
        state.addText("<");
        state.openMark(
          schema.marks.autolink.create({
            href: token.attrGet("href") ?? token.content ?? "",
          }),
        );
        return;
      }

      state.addText("[");
      state.openMark(
        schema.marks.link.create({
          href: token.attrGet("href") ?? "",
          title: token.attrGet("title") || null,
        }),
      );
    },
    link_close: (state, _token, schema) => {
      if (schema.marks.autolink) {
        const autolinkMark = state.topMark(schema.marks.autolink);
        if (autolinkMark) {
          state.closeMarkType(schema.marks.autolink);
          state.addText(">");
          return;
        }
      }

      const mark = state.topMark(schema.marks.link);
      state.closeMarkType(schema.marks.link);
      if (mark) state.addText(closeDelimText(mark));
    },
  },
  inline: {
    priority: 3,
    markNames: ["link"],
    scan,
    extRanges: (parent) => {
      const text = parent.textBetween(0, parent.content.size, "\n", "\ufffc");
      const ranges: Array<[number, number]> = [];
      LINK_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = LINK_RE.exec(text))) {
        const from = match.index;
        if (from > 0 && text[from - 1] === "!") continue;
        ranges.push([from, from + match[0].length]);
      }
      return ranges;
    },
  },
};
