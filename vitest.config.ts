/**
 * Vitest 测试配置
 * @since Beta v0.13.0
 */
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@enum": fileURLToPath(new URL("./src/enum", import.meta.url)),
      "@req": fileURLToPath(new URL("./src/request", import.meta.url)),
      "@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
      "@store": fileURLToPath(new URL("./src/store/modules", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
