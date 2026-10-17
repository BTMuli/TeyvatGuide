# Repository map

## Current stack

Read exact versions from source files. The current major stack is:

- Vue 3 with Composition API and `<script lang="ts" setup>`
- TypeScript 6, Vuetify 4, Vite 8
- Tauri 2 with a Rust 2024 backend
- Pinia 4 with persisted state
- SQLite via `@tauri-apps/plugin-sql`
- pnpm 12

## Main paths

| Path                 | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `src/components/`    | Shared and feature UI components                        |
| `src/pages/`         | Routed application pages                                |
| `src/views/`         | Auxiliary Tauri window views                            |
| `src/request/`       | Remote API request modules                              |
| `src/plugins/`       | Bili, Hutao, SQLite, and integration modules            |
| `src/store/modules/` | Pinia stores                                            |
| `src/types/`         | Global `TGApp` declaration files                        |
| `src/enum/`          | Runtime constant-enum objects                           |
| `src-tauri/src/`     | Rust backend, commands, plugins, tray, and window logic |
| `scripts/`           | Development, build, and version scripts                 |
| `test/`              | Node-based Vitest business logic and state regressions  |

## Configured aliases

`@/`, `@styles/`, `@comp/`, `@enum/`, `@hooks/`, `@Bili/`, `@Hutao/`, `@Mys/`, `@Sql/`,
`@Sqlm/`, `@req/`, `@store/`, and `@utils/` are defined in both `tsconfig.json` and `vite.config.ts`.
Do not invent a new alias in only one of those files.

## Commands

| Command              | Purpose                                 |
| -------------------- | --------------------------------------- |
| `pnpm dev`           | Start the project development flow      |
| `pnpm build`         | Run the project build flow              |
| `pnpm lint`          | Run all non-fix lint tasks concurrently |
| `pnpm lint:fix`      | Run configured auto-fix tasks           |
| `pnpm lint-vue`      | Run Vue/TypeScript type checking        |
| `pnpm test`          | Run Vitest once                         |
| `pnpm test:watch`    | Run Vitest interactively                |
| `pnpm lint:code`     | Run ESLint                              |
| `pnpm lint:style`    | Run Stylelint                           |
| `pnpm lint:rust:fix` | Format Rust code                        |

Prefer targeted non-mutating checks during verification. Do not run fix commands unless formatting/fixing the task
files is intended.

For selecting regression, Rust, documentation, or desktop checks, read [testing](../../testing/SKILL.md).
`pnpm lint` covers code/style checks; type checking, Vitest, and Rust checks are separate. Inspect build side effects
before using `pnpm build` or `pnpm debug` for validation.
