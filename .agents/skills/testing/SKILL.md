---
name: testing
description: Design and run focused regression tests and delivery checks for TeyvatGuide. Use when changing observable behavior, reproducing a bug, reviewing test coverage, or choosing validation before delivery or a commit. Documentation and styling changes need only the checks relevant to their scope.
---

# TeyvatGuide Testing

## Select the evidence

Inspect the affected implementation, nearby tests, `package.json`, `vitest.config.ts`, `tsconfig.json`, and relevant configuration.
Identify the observable behavior and likely regression before selecting checks. A formatting check, type check,
unit test, Rust compile, and desktop interaction establish different things; report only what each actually proves.

Use the smallest sufficient set from the matrix below. Expand after a relevant failure, a shared dependency change,
or an unresolved concern; do not repeat passing checks without a reason. Use non-fix commands for verification.

| Change or concern                     | Validation                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| TypeScript/Vue types, including tests | `pnpm lint-vue`                                                                   |
| TypeScript/Vue/JS/configuration code  | `pnpm lint:code`                                                                  |
| Vue/SCSS/CSS styles                   | `pnpm lint:style`                                                                 |
| Business logic, calculations, state   | `pnpm exec vitest run <test-path>`; `pnpm test` when multiple suites are affected |
| Rust formatting                       | `cargo fmt --check` from `src-tauri`                                              |
| Rust behavior or command contracts    | `cargo check` and relevant `cargo test <filter>` from `src-tauri`, as applicable  |
| Markdown or skill documentation       | Review content/links; `pnpm exec prettier --check <paths>`; skill validation      |
| Broad frontend changes                | `pnpm lint`, plus `pnpm lint-vue` and relevant tests                              |

For narrow changes, use `pnpm exec eslint <paths>` or `pnpm exec stylelint <paths>` where sufficient. At final
acceptance, choose either the relevant test files or the full suite; a full run already covers those files.
A focused run during reproduction followed by a full run after a shared-logic fix serves different purposes.

For new or changed skills, locate `scripts/quick_validate.py` inside the installed `skill-creator` skill directory
and run `python <skill-creator-dir>/scripts/quick_validate.py <skill-dir>`. If the skill, validator, or its
dependencies are unavailable, report the missing structural check; do not guess its location or install tools
solely for documentation validation.

Only use the desktop connector when the user explicitly requests tauri-connector screenshot recognition; follow
`../tauri-connector/SKILL.md` and reuse the running debug instance. Otherwise report any desktop/manual acceptance
still needed without starting the app solely for validation.

`pnpm lint` currently runs the non-fix `lint:*` scripts (code and style). It does **not** include `lint-vue`, Vitest,
Rust formatting, Rust compilation, or desktop behavior. `pnpm test:watch` is for interactive development; delivery
checks must terminate. Re-read the scripts when they change.

## Add a regression test when it protects behavior

- For a bug fix, reproduce the failure with a focused case when feasible, then verify the corrected result. Keep
  relevant boundary and failure cases, especially shared inventory, rollback, user/project isolation, and persisted
  state when those are affected. Do not mechanically require all of these for every change.
- Test public inputs, outputs, and meaningful state transitions. Do not mirror the implementation, assert source
  text, or add tests solely for reversible copy, styling, or formatting changes.
- Extend the nearest suite rather than introducing a parallel framework. Implementation and its regression case
  normally belong to the same behavioral change and commit.
- Mock external boundaries such as Tauri IPC, HTTP, clock, and storage only where needed. Exercise the real business
  function or store; do not mock away the behavior under test. Use memory storage or temporary files/databases,
  never the user's live accounts, app database, or persisted settings. Clean up shared state after each case.
- Follow `../../rules/typescript-rules.md` for test code, including typed fixtures and `.js` import extensions.

## Current test boundaries

Vitest runs in the **Node** environment and discovers only `test/**/*.test.ts`. Import test APIs explicitly from
`vitest`. Its config defines only `@` and `@utils` aliases; aliases and Vue/Vuetify plugins from `vite.config.ts`
are not automatically available in this separate config.

The existing calculation suites exercise real utility functions and local Wiki data. The conversion-state suite
uses real Pinia and its persistence plugin with memory storage and `createSSRApp`, then disposes Pinia. These are
useful starting points for similar behavior. The repository has no configured browser/DOM component test harness;
do not claim Node tests validate rendering, WebView IPC, or OS integration. Add infrastructure only when the task
requires it and explain that scope.

## Verification artifacts

Keep maintained regression tests and their required fixtures/helpers under `test/`, organized by behavior and
matching the discovery pattern above. Retain them with the implementation. Put one-off scripts, harnesses,
fixtures, and outputs together in a purpose-named subdirectory of the OS temporary directory, rather than
scattering them into source or permanent test directories. Remove only temporary files created by this task
after verification; do not delete or unstage pre-existing user files. Exclude throwaway artifacts from commits
unless the user explicitly asks to keep them.

## Builds, failures, and delivery

- Choose build checks only when compilation, packaging, or asset integration needs verification. Inspect the build
  scripts and plugins first: `pnpm build` rewrites `.env.production` and can create/upload Sentry releases and
  artifacts; `pnpm debug` also rewrites that file. These are not default read-only acceptance checks, and local
  validation does not authorize publishing. Account for these side effects before running either command.
- If a check fails, retain the command and first actionable diagnostic. Distinguish a task regression from an
  existing failure or missing dependency/toolchain. Fix within scope; do not disable assertions or lint rules to
  obtain a pass. Report unavailable validation and its impact rather than silently substituting a weaker check.
- Inspect `git diff --check`, `git diff --cached --check` when staged content is involved, the actual diff, and
  `git status --short` after verification. Preserve unrelated changes and generated files already owned by the user.
- Report the changed behavior, exact checks and outcomes, and any remaining gap. Testing or delivery does not
  authorize staging or committing; use `../git-workflow/SKILL.md` only for an explicitly requested Git workflow.
