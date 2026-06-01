import type { Schema } from "prosemirror-model";
import { inputRules, wrappingInputRule } from "prosemirror-inputrules";
import type { FeatureSpec } from "./_types.ts";

export const blockquote: FeatureSpec = {
  name: "blockquote",
  plugins: (schema) => [blockquoteInputRules(schema)],
};

export function blockquoteInputRules(schema: Schema) {
  return inputRules({
    rules: [wrappingInputRule(/^>\s$/, schema.nodes.blockquote)],
  });
}
