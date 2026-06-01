import type { MarkSpec } from "prosemirror-model";
import { markConsumed, type InlineFeatureSpec, type InlineSpan } from "./inline-parse.ts";
import type { FeatureSpec } from "./_types.ts";

const URI_PART = "[a-zA-Z][a-zA-Z0-9+.-]*:[^\\s<>]+";
const EMAIL_PART = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}";
const AUTOLINK_RE = new RegExp(`<((?:${URI_PART})|(?:${EMAIL_PART}))>`, "g");

export function isValidAutolinkUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s<>]+$/.test(value);
}

const scan: InlineFeatureSpec["scan"] = (text, consumed) => {
  const out: InlineSpan[] = [];
  AUTOLINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = AUTOLINK_RE.exec(text))) {
    const fullStart = match.index;
    const fullEnd = fullStart + match[0].length;
    let blocked = false;
    for (let i = fullStart; i < fullEnd; i += 1) {
      if (consumed[i]) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    const inner = match[1]!;
    const isEmail = !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(inner);
    const href = isEmail ? `mailto:${inner}` : inner;
    markConsumed(consumed, fullStart, fullEnd);
    out.push({
      type: "autolink",
      from: fullStart + 1,
      to: fullEnd - 1,
      openFrom: fullStart,
      openTo: fullStart + 1,
      closeFrom: fullEnd - 1,
      closeTo: fullEnd,
      attrs: { href },
    });
  }

  return out;
};

export const autolink: FeatureSpec = {
  name: "autolink",
  marks: {
    autolink: {
      attrs: { href: {} },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[data-autolink]",
          getAttrs: (dom) => ({ href: (dom as HTMLElement).getAttribute("href") ?? "" }),
        },
      ],
      toDOM(mark) {
        return ["a", { href: mark.attrs.href as string, "data-autolink": "" }, 0];
      },
    } as MarkSpec,
  },
  markDelims: {
    autolink: { open: "", close: "" },
  },
  inline: {
    priority: 2.5,
    markNames: ["autolink"],
    scan,
    extRanges: (parent) => {
      const text = parent.textBetween(0, parent.content.size, "\n", "\ufffc");
      const ranges: Array<[number, number]> = [];
      AUTOLINK_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = AUTOLINK_RE.exec(text))) {
        ranges.push([match.index, match.index + match[0].length]);
      }
      return ranges;
    },
  },
};
