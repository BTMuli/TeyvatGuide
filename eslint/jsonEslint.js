/**
 * JSON 文件的 ESLint 配置
 * @since Beta v0.11.3
 */

import pluginJsonc from "eslint-plugin-jsonc";
import * as parserJsonc from "jsonc-eslint-parser";

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

const characterJsonConfig = {
  files: ["src/data/WIKI/character/**/*.json"],
  plugins: { jsonc: pluginJsonc },
  languageOptions: { parser: parserJsonc },
  rules: {
    "jsonc/comma-dangle": ["error", "never"],
    "jsonc/sort-keys": [
      "error",
      {
        pathPattern: "^$",
        order: [
          "id",
          "name",
          "title",
          "description",
          "area",
          "brief",
          "star",
          "elePrefix",
          "element",
          "weapon",
          "materials",
          "constellation",
          "skills",
          "food",
          "talks",
          "stories",
          "team",
        ],
      },
    ],
  },
};

const jsoncConfig = {
  files: ["source/data/out/**/*.json", ".vscode/**/*.json", "./tsdoc.json"],
  plugins: { jsonc: pluginJsonc },
  languageOptions: { parser: parserJsonc },
  rules: {
    "jsonc/comma-dangle": ["error", "never"],
    "jsonc/sort-keys": ["error", { pathPattern: "^$", order: { type: "asc" } }],
  },
};

const eslintConfigJson = [pkgJsonConfig, tscJsonConfig, characterJsonConfig, jsoncConfig];

export default eslintConfigJson;
