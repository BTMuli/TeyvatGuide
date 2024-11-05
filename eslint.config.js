import eslint_jsonc from "eslint-plugin-jsonc";
import eslint_js from "@eslint/js";
import eslint_ts from "typescript-eslint";
import eslint_vue from "eslint-plugin-vue";

import { jsonEslintConfig } from "./eslint/jsonEslint.js";
import { vueEslintConfig } from "./eslint/vueEslint.js";
import ymlEslintConfig from "./eslint/ymlEslint.js";

export default [
  eslint_js.configs.recommended,
  ...eslint_jsonc.configs["flat/recommended-with-jsonc"],
  ...eslint_ts.configs.recommended,
  ...eslint_vue.configs["flat/essential"],
  ...jsonEslintConfig,
  ...vueEslintConfig,
  ymlEslintConfig,
  {
    ignores: [
      "dist",
      "src-tauri/target",
      "pnpm-lock.yaml",
      "src/data/**/*.json",
      "src-tauri/tauri.conf.json",
      "src-tauri/**/*.json",
      "qodana.yaml",
      ".github",
      ".vscode",
      ".prettierrc.yml",
      ".stylelintrc.yml",
    ],
  },
];
