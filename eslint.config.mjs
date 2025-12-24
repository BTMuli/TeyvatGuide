/**
 * ESLint配置文件
 * @since 2025-05-29
 */
import eslintPluginJsonc from "eslint-plugin-jsonc";
import eslintPluginJs from "@eslint/js";
import eslintPluginTs from "typescript-eslint";
import eslintPluginVue from "eslint-plugin-vue";

import eslintConfigJson from "./eslint/jsonEslint.js";
import eslintConfigVue from "./eslint/vueEslint.js";
import eslintConfigYml from "./eslint/ymlEslint.js";

export default [
  eslintPluginJs.configs.recommended,
  ...eslintPluginJsonc.configs["flat/recommended-with-jsonc"],
  ...eslintPluginTs.configs.recommended,
  ...eslintPluginVue.configs["flat/essential"],
  ...eslintConfigJson,
  ...eslintConfigVue,
  eslintConfigYml,
  {
    ignores: [
      "dist",
      "src-tauri/target",
      "pnpm-lock.yaml",
      "src/data/**/*.json",
      "src-tauri/tauri.conf.json",
      "src-tauri/**/*.json",
      "node_modules",
      ".github",
    ],
  },
];
