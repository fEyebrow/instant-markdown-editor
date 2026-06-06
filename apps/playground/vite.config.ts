import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").pop() ?? "instant-markdown-editor";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? `/${repositoryName}/` : "/",
  resolve: {
    alias: {
      "instant-markdown-editor/style.css": fileURLToPath(
        new URL("../../packages/editor/src/style.css", import.meta.url),
      ),
      "instant-markdown-editor/specs": fileURLToPath(
        new URL("../../packages/editor/src/specs.ts", import.meta.url),
      ),
      "instant-markdown-editor": fileURLToPath(
        new URL("../../packages/editor/src/index.ts", import.meta.url),
      ),
    },
  },
});
