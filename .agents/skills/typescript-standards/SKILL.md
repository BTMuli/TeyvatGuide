---
name: typescript-standards
description: Write and review TypeScript and Vue code using TeyvatGuide's ESLint, Prettier, type declaration, const-enum, runtime-value, and TSDoc conventions. Use when changing .ts, .d.ts, or .vue files, especially types, enums, exported APIs, and Vue state.
---

# TypeScript Standards

1. Read `../../rules/typescript-rules.md`, [source metadata rules](../../rules/source-metadata-rules.md), and the
   nearest code before editing.
2. Treat `eslint/vueEslint.js`, `.prettierrc.yml`, and `tsconfig.json` as executable sources of truth when prose and
   configuration differ.
3. Use `Array<T>`, `type`, explicit public function types, and angle-bracket assertions where an assertion is
   unavoidable. Prefer narrowing and `unknown` first.
4. Reuse shared types from `src/types/<Domain>/*.d.ts` (or an existing plugin `types` directory) and keep
   file-local types near their use; do not create `Types/` or a separate `types.ts` just for types.
5. Do not add native TypeScript `enum`. Read [enum patterns](references/enum.md) when adding a value set or mapping
   declaration-space values to runtime objects.
6. Read [TSDoc conventions](references/tsdoc.md) when adding or changing functions, types, or exported declarations.
   Use `package.json`'s `since` (never `version`) for changed file headers and affected declaration tags; non-Vue
   functions changed without docs need a short TSDoc, while Vue files keep the documented header exception.
7. Preserve NodeNext `.js` import extensions, follow the grouping enforced by `import-x/order`, and use
   `import type { ... }` for type-only imports.
8. Respect the ESLint TS error rules: no unused variables or expressions (including short-circuit/ternary chains),
   no `@ts-ignore`/`@ts-nocheck` or description-less `@ts-expect-error`, no runtime namespaces (`declare` only in
   `.d.ts`), and `as const`/`<const>` over literal type assertions.
9. Validate with `pnpm lint-vue` and `pnpm lint:code`; add `pnpm lint:style` when Vue styles change.
