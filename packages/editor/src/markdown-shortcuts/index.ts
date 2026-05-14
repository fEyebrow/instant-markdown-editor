import { inputRules } from "prosemirror-inputrules";
import type { Schema } from "prosemirror-model";
import type { Plugin } from "prosemirror-state";
import { headingRule } from "./rules.ts";

export function markdownShortcutsPlugin(schema: Schema): Plugin {
  return inputRules({ rules: [headingRule(schema)] });
}
