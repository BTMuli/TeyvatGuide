/**
 * @file eslint/ymlEslint.js
 * @description YAML相关的ESLint配置
 * @since Beta v0.7.7
 */
import pluginYml from "eslint-plugin-yml";
import parserYml from "yaml-eslint-parser";

const eslintConfigYml = {
  files: ["**/*.yml", "**/*.yaml"],
  plugins: { yml: pluginYml },
  languageOptions: {
    parser: parserYml,
    parserOptions: { defaultYAMLVersion: "1.2", extraFileExtensions: [".yaml", ".yml"] },
  },
  rules: {
    "yml/indent": ["error", 2],
    "yml/key-spacing": ["error"],
    "yml/quotes": ["error", { prefer: "double", avoidEscape: true }],
    "yml/sort-keys": ["error", "asc"],
  },
};

export default eslintConfigYml;
