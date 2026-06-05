import type { MarkSpec } from "prosemirror-model";
import { imageWidgetsPlugin } from "./image-widgets.ts";
import { markConsumed, type InlineFeatureSpec, type InlineSpan } from "./inline-parse.ts";
import type { FeatureSpec } from "./_types.ts";

const IMAGE_RE = /!\[([^\]\n]*?)\]\(([^\s)\n]*)(?:\s+"([^"\n]*)")?\)/g;

const scan: InlineFeatureSpec["scan"] = (text, consumed) => {
  const out: InlineSpan[] = [];
  IMAGE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = IMAGE_RE.exec(text))) {
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

    const alt = match[1]!;
    const src = match[2]!;
    const title = match[3] ?? null;
    const openFrom = fullStart;
    const openTo = fullStart + 2;
    const contentFrom = openTo;
    const contentTo = contentFrom + alt.length;
    const closeFrom = contentTo;
    const closeTo = fullEnd;

    markConsumed(consumed, openFrom, closeTo);

    const span: InlineSpan = {
      type: "image",
      from: contentFrom,
      to: contentTo,
      openFrom,
      openTo,
      closeFrom,
      closeTo,
      attrs: { src, alt, title },
    };

    if (src !== "") {
      span.delimRanges = [{ from: openFrom, to: closeTo }];
    } else {
      span.delimRanges = [];
    }

    out.push(span);
  }

  return out;
};

export const image: FeatureSpec = {
  name: "image",
  marks: {
    image: {
      attrs: {
        src: {},
        alt: { default: "" },
        title: { default: null },
      },
      inclusive: false,
      parseDOM: [],
      toDOM() {
        return ["span", { class: "md-image-source" }, 0];
      },
    } as MarkSpec,
  },
  parserTokens: {
    image: (state, token, schema) => {
      const src = token.attrGet("src") ?? "";
      const alt = token.content ?? "";
      const title = token.attrGet("title") || null;
      state.addText("![");
      state.openMark(schema.marks.image.create({ src, alt, title }));
      state.addText(alt);
      state.closeMarkType(schema.marks.image);
      const titleSuffix = title ? ` "${title.replace(/"/g, '\\"')}"` : "";
      state.addText(`](${src}${titleSuffix})`);
    },
  },
  inline: {
    priority: 1.5,
    markNames: ["image"],
    scan,
    extRanges: (parent) => {
      const text = parent.textBetween(0, parent.content.size, "\n", "\ufffc");
      const ranges: Array<[number, number]> = [];
      IMAGE_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = IMAGE_RE.exec(text))) {
        ranges.push([match.index, match.index + match[0].length]);
      }
      return ranges;
    },
  },
  plugins: () => [imageWidgetsPlugin()],
};
