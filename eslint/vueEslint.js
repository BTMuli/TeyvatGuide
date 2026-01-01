/**
 * Vue & Typescript 文件的 Eslint 配置
 * @since Beta v0.9.1
 */
import pluginImport from "eslint-plugin-import";
import pluginPrettier from "eslint-plugin-prettier";
import pluginVue from "eslint-plugin-vue";
import pluginTsDoc from "eslint-plugin-tsdoc";
import globals from "globals";
import eslintTs from "typescript-eslint";
import parserVue from "vue-eslint-parser";
import appRootPath from "app-root-path";

const tsConfigRules = {
  "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "angle-bracket" }],
  "@typescript-eslint/no-import-type-side-effects": "error",
  "@typescript-eslint/strict-boolean-expressions": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: false }],
  "@typescript-eslint/array-type": ["error", { "default": "generic" }],
  "@typescript-eslint/consistent-type-definitions": ["error", "type"],
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
  plugins: { typescript: eslintTs, import: pluginImport, prettier: pluginPrettier, tsdoc: pluginTsDoc },
  languageOptions: {
    parser: eslintTs.parser,
    parserOptions: { project: "tsconfig.json", tsconfigRootDir: appRootPath.path },
  },
  rules: {
    ...tsConfigRules,
    "tsdoc/syntax": "warn",
  },
};

const vueConfig = {
  files: ["src/**/*.vue", "src/App.vue"],
  plugins: { vue: pluginVue, import: pluginImport, prettier: pluginPrettier },
  languageOptions: {
    globals: { ...globals.browser, ...globals.es2021, TGApp: "readonly", window: "readonly", proEnv: "readonly" },
    ecmaVersion: "latest",
    sourceType: "module",
    parser: parserVue,
    parserOptions: {
      parser: eslintTs.parser,
      extraFileExtensions: [".vue"],
      tsconfigRootDir: appRootPath.path,
    },
  },
  rules: { ...tsConfigRules, "vue/multi-word-component-names": "off" },
};

const eslintConfigVue = [tsConfig, vueConfig];

export default eslintConfigVue;
