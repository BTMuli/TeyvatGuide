/**
 * @file eslint/vueEslint.js
 * @description Vue相关的ESLint配置
 * @since Beta v0.7.7
 */
import pluginImport from "eslint-plugin-import";
import pluginPrettier from "eslint-plugin-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import eslintTs from "typescript-eslint";
import parserVue from "vue-eslint-parser";

const tsConfigRules = {
  "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "angle-bracket" }],
  "@typescript-eslint/no-import-type-side-effects": "error",
  "@typescript-eslint/strict-boolean-expressions": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: false }],
  "import/order": [
    "error",
    {
      groups: ["builtin", "external", "internal", "parent", "sibling", "index", "unknown"],
      "newlines-between": "always",
      alphabetize: { order: "asc", caseInsensitive: true },
    },
  ],
  "prettier/prettier": "error",
};

const tsConfig = {
  files: ["*.ts", "*.d.ts", "src/**/*.ts", "src/**/*.d.ts"],
  plugins: { typescript: eslintTs, import: pluginImport, prettier: pluginPrettier },
  languageOptions: {
    parser: eslintTs.parser,
    parserOptions: { project: "tsconfig.json", tsconfigRootDir: "." },
  },
  rules: tsConfigRules,
};

const vueConfig = {
  files: ["src/**/*.vue", "src/App.vue"],
  plugins: { vue: pluginVue, import: pluginImport, prettier: pluginPrettier },
  languageOptions: {
    globals: { ...globals.browser, ...globals.es2021, TGApp: "readonly", window: "readonly" },
    ecmaVersion: "latest",
    sourceType: "module",
    parser: parserVue,
    parserOptions: {
      parser: eslintTs.parser,
      extraFileExtensions: [".vue"],
      tsconfigRootDir: ".",
    },
  },
  rules: { ...tsConfigRules, "vue/multi-word-component-names": "off" },
};

const eslintConfigVue = [tsConfig, vueConfig];

export default eslintConfigVue;
