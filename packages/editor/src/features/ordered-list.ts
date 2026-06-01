import type { Schema } from "prosemirror-model";
import { inputRules, wrappingInputRule } from "prosemirror-inputrules";
import type { FeatureSpec } from "./_types.ts";

export const orderedList: FeatureSpec = {
  name: "ordered-list",
  plugins: (schema) => [orderedListInputRules(schema)],
};

export function orderedListInputRules(schema: Schema) {
  return inputRules({
    rules: [
      wrappingInputRule(
        /^(\d+)\.\s$/,
        schema.nodes.ordered_list,
        (match) => ({ order: Number(match[1]) }),
        (match, node) => node.childCount + (node.attrs.order as number) === Number(match[1]),
      ),
    ],
  });
}
