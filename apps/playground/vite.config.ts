import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: {
      "@rte/editor/style.css": fileURLToPath(
        new URL("../../packages/editor/src/style.css", import.meta.url),
      ),
      "@rte/editor/specs": fileURLToPath(
        new URL("../../packages/editor/src/specs.ts", import.meta.url),
      ),
      "@rte/editor": fileURLToPath(new URL("../../packages/editor/src/index.ts", import.meta.url)),
    },
  },
});
