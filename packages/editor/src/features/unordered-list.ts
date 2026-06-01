import type { Schema } from "prosemirror-model";
import { inputRules, wrappingInputRule } from "prosemirror-inputrules";
import { liftListItem, sinkListItem, splitListItem } from "prosemirror-schema-list";
import type { FeatureSpec } from "./_types.ts";

export const unorderedList: FeatureSpec = {
  name: "unordered-list",
  plugins: (schema) => [unorderedListInputRules(schema)],
  keymaps: (schema) => [unorderedListKeymap(schema)],
};

export function unorderedListInputRules(schema: Schema) {
  return inputRules({
    rules: [wrappingInputRule(/^([-+*])\s$/, schema.nodes.bullet_list)],
  });
}

export function unorderedListKeymap(schema: Schema) {
  const { list_item } = schema.nodes;
  return {
    Enter: splitListItem(list_item),
    Tab: sinkListItem(list_item),
    "Shift-Tab": liftListItem(list_item),
  };
}
