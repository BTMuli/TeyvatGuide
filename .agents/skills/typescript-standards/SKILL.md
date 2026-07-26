---
name: typescript-standards
description: Write and review TypeScript and Vue code using TeyvatGuide's ESLint, Prettier, type declaration, const-enum, runtime-value, and TSDoc conventions. Use when changing .ts, .d.ts, or .vue files, especially types, enums, exported APIs, and Vue state.
---

# TypeScript Standards

1. Read `../../rules/typescript-rules.md` and the nearest code before editing.
2. Treat `eslint/vueEslint.js`, `.prettierrc.yml`, and `tsconfig.json` as executable sources of truth when prose and
   configuration differ.
3. Use `Array<T>`, `type`, explicit public function types, and angle-bracket assertions where an assertion is
   unavoidable. Prefer narrowing and `unknown` first.
4. Do not add native TypeScript `enum`. Read [enum patterns](references/enum.md) when adding a value set or mapping
   declaration-space values to runtime objects.
5. Read [TSDoc conventions](references/tsdoc.md) when adding or changing exported declarations.
6. Preserve NodeNext `.js` import extensions and follow the grouping enforced by `import-x/order`.
7. Validate with `pnpm lint-vue` and `pnpm lint:code`; add `pnpm lint:style` when Vue styles change.
