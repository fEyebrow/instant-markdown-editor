import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import type { Mark, MarkSpec, MarkType, Node as ProseMirrorNode, Schema } from "prosemirror-model";
import type { Command, Plugin } from "prosemirror-state";
import type { InlineFeatureSpec } from "./inline-parse.ts";

export type MarkdownParseState = {
  addText: (text: string) => void;
  openMark: (mark: Mark) => void;
  closeMarkType: (mark: MarkType) => void;
  topMark: (mark: MarkType) => Mark | null;
};

export type MarkdownTokenHandler = (
  state: MarkdownParseState,
  token: Token,
  schema: Schema,
) => void;

export type SerializerMarkSpec = {
  open: string | ((state: unknown, mark: Mark, parent: ProseMirrorNode, index: number) => string);
  close: string | ((state: unknown, mark: Mark, parent: ProseMirrorNode, index: number) => string);
  expelEnclosingWhitespace?: boolean;
  escape?: boolean;
};

export type FeatureSpec = {
  name: string;
  marks?: Record<string, MarkSpec>;
  mdItPlugins?: Array<(tokenizer: MarkdownIt) => void>;
  parserTokens?: Record<string, MarkdownTokenHandler>;
  markDelims?: Record<string, SerializerMarkSpec>;
  inline?: InlineFeatureSpec;
  plugins?: (schema: Schema) => Plugin[];
  keymaps?: (schema: Schema) => Record<string, Command>[];
};
