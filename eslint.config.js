import { jsonEslintConfig } from "./eslint/jsonEslint.js";
import ymlEslintConfig from "./eslint/ymlEslint.js";
import { vueEslintConfig } from "./eslint/vueEslint.js";

export default [
  ...jsonEslintConfig,
  ymlEslintConfig,
  ...vueEslintConfig,
  {
    ignores: ["dist", "src-tauri/target", "pnpm-lock.yaml", "src/data/**/*.json"],
  },
];
