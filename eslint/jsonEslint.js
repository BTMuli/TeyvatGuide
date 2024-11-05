import pluginJsonc from "eslint-plugin-jsonc";
import parserJsonc from "jsonc-eslint-parser";

const pkgJsonConfig = {
  files: ["package.json"],
  plugins: { jsonc: pluginJsonc },
  languageOptions: { parser: parserJsonc },
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
  plugins: { jsonc: pluginJsonc },
  languageOptions: { parser: parserJsonc },
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
  plugins: { jsonc: pluginJsonc },
  languageOptions: { parser: parserJsonc },
  rules: {
    "jsonc/comma-dangle": ["error", "never"],
    "jsonc/sort-keys": ["error", { pathPattern: "^$", order: { type: "asc" } }],
  },
};

export const jsonEslintConfig = [pkgJsonConfig, tscJsonConfig, jsoncConfig];
