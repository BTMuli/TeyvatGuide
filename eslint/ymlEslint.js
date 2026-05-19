/**
 * YAML 文件的 ESLint 配置
 * @since Beta v0.10.2
 */
import pluginYml from "eslint-plugin-yml";
import * as ymlParser from "yaml-eslint-parser";

const eslintConfigYml = [
  {
    files: ["**/*.yml", "**/*.yaml", "pnpm-workspace.yaml", ".stylelintrc.yml", ".prettierrc.yml"],
    plugins: { yml: pluginYml },
    languageOptions: {
      parser: ymlParser,
      parserOptions: { defaultYAMLVersion: "1.2", extraFileExtensions: [".yaml", ".yml"] },
    },
    rules: {
      "yml/indent": ["error", 2],
      "yml/key-spacing": ["error"],
      "yml/quotes": ["error", { prefer: "double", avoidEscape: true }],
      "yml/sort-keys": ["error", "asc"],
    },
  },
];

export default eslintConfigYml;
