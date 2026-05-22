import type { Schema } from "prosemirror-model";
import { liftListItem, sinkListItem, splitListItem } from "prosemirror-schema-list";

export function listKeymap(schema: Schema) {
  const { list_item } = schema.nodes;
  return {
    Enter: splitListItem(list_item),
    Tab: sinkListItem(list_item),
    "Shift-Tab": liftListItem(list_item),
  };
}
