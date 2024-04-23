import eslint_jsonc from "eslint-plugin-jsonc";
import jsonc_parser from "jsonc-eslint-parser";

const pkgJsonConfig = {
  files: ["package.json"],
  plugins: {
    jsonc: eslint_jsonc,
  },
  languageOptions: {
    parser: jsonc_parser,
  },
  rules: {
    "jsonc/comma-dangle": ["error", "never"],
    "jsonc/sort-keys": [
      "error",
      {
        pathPattern: "^$",
        order: [
          "name",
          "version",
          "description",
          "type",
          "packageManager",
          "scripts",
          "lint-staged",
          "keywords",
          "author",
          "license",
          "repository",
          "homepage",
          "bugs",
          "dependencies",
          "devDependencies",
        ],
      },
    ],
  },
};

const tscJsonConfig = {
  files: ["tsconfig.json"],
  plugins: {
    jsonc: eslint_jsonc,
  },
  languageOptions: {
    parser: jsonc_parser,
  },
  rules: {
    "jsonc/comma-dangle": ["error", "never"],
    "jsonc/sort-keys": [
      "error",
      {
        pathPattern: "^$",
        order: [
          "compilerOptions",
          "include",
          "exclude",
          "extends",
          "files",
          "references",
          "typeAcquisition",
        ],
      },
    ],
  },
};

const jsoncConfig = {
  files: ["source/data/out/**/*.json", ".vscode/**/*.json"],
  plugins: {
    jsonc: eslint_jsonc,
  },
  languageOptions: {
    parser: jsonc_parser,
  },
  rules: {
    "jsonc/comma-dangle": ["error", "never"],
    "jsonc/sort-keys": [
      "error",
      {
        pathPattern: "^$",
        order: {
          type: "asc",
        },
      },
    ],
  },
};

export const jsonEslintConfig = [
  ...eslint_jsonc.configs["flat/recommended-with-json"],
  pkgJsonConfig,
  tscJsonConfig,
  jsoncConfig,
];
