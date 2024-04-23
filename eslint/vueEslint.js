import eslint_js from "@eslint/js";
import eslint_import from "eslint-plugin-import";
import eslint_prettier from "eslint-plugin-prettier";
import eslint_vue from "eslint-plugin-vue";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import eslint_ts from "typescript-eslint";
import vue_parser from "vue-eslint-parser";

const tsConfigRules = {
  "@typescript-eslint/consistent-type-assertions": [
    "error",
    {
      assertionStyle: "angle-bracket",
    },
  ],
  "@typescript-eslint/no-import-type-side-effects": "error",
  "@typescript-eslint/strict-boolean-expressions": "warn",
  "@typescript-eslint/no-explicit-any": "warn",
  "import/order": [
    "error",
    {
      groups: ["builtin", "external", "internal", "parent", "sibling", "index", "unknown"],
      "newlines-between": "always",
      alphabetize: {
        order: "asc",
        caseInsensitive: true,
      },
    },
  ],
  "prettier/prettier": "error",
};

const tsConfig = {
  files: ["*.ts"],
  plugins: {
    typescript: eslint_ts,
    import: eslint_import,
    prettier: eslint_prettier,
  },
  languageOptions: {
    parser: eslint_ts.parser,
    parserOptions: {
      project: "tsconfig.json",
      tsconfigRootDir: ".",
    },
  },
  rules: tsConfigRules,
};

const vueConfig = {
  plugins: {
    vue: eslint_vue,
    import: eslint_import,
    prettier: eslint_prettier,
  },
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.es2021,
      TGApp: "readonly",
      window: "readonly",
    },
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
  rules: {
    ...tsConfigRules,
    "vue/multi-word-component-names": "off",
  },
};

export const vueEslintConfig = [
  eslint_js.configs.recommended,
  ...eslint_ts.configs.recommended,
  ...eslint_vue.configs["flat/essential"],
  ...pluginVue.configs["flat/essential"],
  tsConfig,
  vueConfig,
];
