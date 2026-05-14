import { textblockTypeInputRule, type InputRule } from "prosemirror-inputrules";
import type { Schema } from "prosemirror-model";

export function headingRule(schema: Schema): InputRule {
  return textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, (match) => ({
    level: match[1].length,
  }));
}
