import pluginImport from "eslint-plugin-import";
import pluginPrettier from "eslint-plugin-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import eslint_ts from "typescript-eslint";
import vue_parser from "vue-eslint-parser";

const tsConfigRules = {
  "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "angle-bracket" }],
  "@typescript-eslint/no-import-type-side-effects": "error",
  "@typescript-eslint/strict-boolean-expressions": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-expressions": [
    "error",
    { allowShortCircuit: false },
  ],
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
  plugins: { typescript: eslint_ts, import: pluginImport, prettier: pluginPrettier },
  languageOptions: {
    parser: eslint_ts.parser,
    parserOptions: { project: "tsconfig.json", tsconfigRootDir: "." },
  },
  rules: tsConfigRules,
};

const vueConfig = {
  files: ["src/**/*.vue"],
  plugins: { vue: pluginVue, import: pluginImport, prettier: pluginPrettier },
  languageOptions: {
    globals: { ...globals.browser, ...globals.es2021, TGApp: "readonly", window: "readonly" },
    ecmaVersion: "latest",
    sourceType: "module",
    parser: vue_parser,
    parserOptions: {
      project: "tsconfig.json",
      parser: eslint_ts.parser,
      extraFileExtensions: [".vue"],
      tsconfigRootDir: ".",
    },
  },
  rules: { ...tsConfigRules, "vue/multi-word-component-names": "off" },
};

export const vueEslintConfig = [tsConfig, vueConfig];
