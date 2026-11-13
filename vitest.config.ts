/**
 * Vitest 测试配置
 * @since Beta v0.13.1
 */
import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@comp": fileURLToPath(new URL("./src/components", import.meta.url)),
      "@hooks": fileURLToPath(new URL("./src/hooks", import.meta.url)),
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
