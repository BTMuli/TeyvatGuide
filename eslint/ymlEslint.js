import eslint_import from "eslint-plugin-import";
import eslint_yml from "eslint-plugin-yml";
import yml_parser from "yaml-eslint-parser";

const ymlEslintConfig = {
  files: ["*.yaml", "*.yml"],
  plugins: {
    yml: eslint_yml,
    import: eslint_import,
  },
  languageOptions: {
    parser: yml_parser,
    parserOptions: {
      defaultYAMLVersion: "1.2",
      project: "./tsconfig.json",
      extraFileExtensions: [".yaml", ".yml"],
    },
  },
  rules: {
    "yml/indent": ["error", 2],
    "yml/key-spacing": ["error"],
    "yml/quotes": [
      "error",
      {
        prefer: "double",
        avoidEscape: true,
      },
    ],
    "yml/sort-keys": ["error", "asc"],
  },
};

export default ymlEslintConfig;
