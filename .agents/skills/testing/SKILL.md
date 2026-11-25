---
name: testing
description: Choose verification checks for TeyvatGuide changes. Use for delivery validation, regression review, or deciding what proves a change works. The repository no longer maintains automated tests.
---

# TeyvatGuide Verification

> **2026-11-25：仓库已删除全部自动化测试与 Vitest 配置。** `test/`、`vitest.config.ts`、`pnpm test`、
> `pnpm test:watch` 均不再存在；`vitest` 依赖已移除。这是项目所有者的明确决定：已上线功能不再维护测试。
> 不要重新引入测试框架、`test/` 目录或测试脚本，除非用户明确要求。

## Select the evidence

Inspect the affected implementation, `package.json`, `tsconfig.json`, and relevant configuration. Identify the
observable behavior and likely regression before selecting checks. A formatting check, type check, Rust compile, and
desktop interaction establish different things; report only what each actually proves.

Use the smallest sufficient set from the matrix below. Expand after a relevant failure, a shared dependency change,
or an unresolved concern; do not repeat passing checks without a reason. Use non-fix commands for verification.

| Change or concern                   | Validation                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| TypeScript/Vue types                | `pnpm lint-vue`                                                              |
| TypeScript/Vue/JS/configuration     | `pnpm lint:code`                                                             |
| Vue/SCSS/CSS styles                 | `pnpm lint:style`                                                            |
| Business logic, calculations, state | `pnpm lint-vue` plus a focused manual reproduction of the changed flow       |
| Rust formatting                     | `cargo fmt --check` from `src-tauri`                                         |
| Rust behavior or command contracts  | `cargo check` and relevant `cargo test <filter>` from `src-tauri`, as needed |
| Markdown or skill documentation     | Review content/links; `pnpm exec prettier --check <paths>`; skill validation |
| Broad frontend changes              | `pnpm lint` plus `pnpm lint-vue`                                             |

For narrow changes, use `pnpm exec eslint <paths>` or `pnpm exec stylelint <paths>` where sufficient.

For new or changed skills, locate `scripts/quick_validate.py` inside the installed `skill-creator` skill directory
and run `python <skill-creator-dir>/scripts/quick_validate.py <skill-dir>`. If the skill, validator, or its
dependencies are unavailable, report the missing structural check; do not guess its location or install tools
solely for documentation validation.

Only use the desktop connector when the user explicitly requests tauri-connector screenshot recognition; follow
`../tauri-connector/SKILL.md` and reuse the running debug instance. Otherwise report any desktop/manual acceptance
still needed without starting the app solely for validation.

`pnpm lint` currently runs the non-fix `lint:*` scripts (code and style). It does **not** include `lint-vue`, Rust
formatting, Rust compilation, or desktop behavior. Re-read the scripts when they change.

## Behavior verification without tests

- Reproduce the changed flow with the smallest practical manual check: dev server interaction, a desktop run, or a
  focused Node/tsx script kept outside the repository when possible. Do not add a permanent test harness for it.
- For request-layer or boundary-validation changes, inspect the guard and exercise success, business-error, and
  malformed-payload paths with a temporary script or captured payload; see
  [boundary validation rules](../../rules/boundary-validation-rules.md).
- State the exact scenario exercised and the observed result. A type check or lint pass is not behavior evidence.
- Clean up temporary scripts and outputs after verification; keep them under a purpose-named OS temporary directory.

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
