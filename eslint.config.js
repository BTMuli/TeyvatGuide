import { jsonEslintConfig } from "./eslint/jsonEslint.js";
import { vueEslintConfig } from "./eslint/vueEslint.js";
import ymlEslintConfig from "./eslint/ymlEslint.js";

export default [
  ...jsonEslintConfig,
  ymlEslintConfig,
  ...vueEslintConfig,
  {
    ignores: ["dist", "src-tauri/target", "pnpm-lock.yaml", "src/data/**/*.json"],
  },
];
