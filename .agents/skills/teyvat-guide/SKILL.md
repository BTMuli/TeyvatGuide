---
name: teyvat-guide
description: Implement and review changes in the TeyvatGuide Vue, TypeScript, Vuetify, Tauri, Rust, Pinia, and SQLite repository, including remote GitHub state such as issues, pull requests, releases, and workflow runs. Use for repository-specific components, pages, API integrations, desktop commands, database work, build configuration, validation, or GitHub remote questions about this repository.
---

# TeyvatGuide Development

1. Inspect `package.json`, the nearest implementation, and relevant configuration before editing. Treat dependency
   versions and scripts in the repository as authoritative.
2. Read [repository map](references/repository-map.md) to locate code, aliases, and validation commands.
3. For TypeScript or Vue work, read `../../rules/typescript-rules.md`. Use
   `../typescript-standards/SKILL.md` when defining enums, declarations, or TSDoc-heavy APIs.
4. For database work, read `../../rules/sqlite-rules.md` and preserve transaction/error-handling behavior.
5. For Rust/Tauri work, follow the patterns in `src-tauri/src`, keep platform-specific behavior guarded, and format
   with Rustfmt.
6. For desktop UI preview, screenshots, WebView interaction, or IPC debugging, use
   `../tauri-mcp-cli/SKILL.md` and target the debug app rather than the installed release app.
7. Make the smallest coherent change and avoid unrelated cleanup, bulk data rewrites, or generated artifacts.
8. Run validation proportional to the change and report anything not run.

## Remote GitHub access

9. The checked-out repository is `BTMuli/TeyvatGuide` (`origin`), default branch `master`. Verify with
   `git remote -v` and `git branch --show-current`; treat those as authoritative.
10. For remote state (issues, PRs, releases, tags, workflow runs, code search), use the installed `github` MCP
    server. Read [github-remote.md](references/github-remote.md) for the connection contract, tool selection, and
    safety rules. Prefer local `git` for checked-out history and use the `gh` CLI only when no MCP tool fits.
11. Never create or mutate GitHub issues, PRs, comments, releases, or gists without an explicit user request.

## Editing while the dev server is running

12. Never rewrite a `.vue` file twice in quick succession while `pnpm dev` is running (for example
   `apply_patch` followed immediately by `prettier --write`, or formatting several `.vue` files in
   one pass). This races sass-embedded on Windows: every `.vue` style submodule then fails with
   `[plugin:vite:css] [sass] Tried writing to closed dispatcher` (HTTP 500) until the dev server is
   restarted.
13. If that error appears, first compile the `<style>` block standalone with `sass-embedded`. A
    success proves the file itself is fine and the running dev server just needs a restart; do not
    "fix" the file. While the dev server is up, prefer one atomic write per file that already keeps
    the repo's CRLF endings, and verify a style submodule via the dev server URL
    (`http://localhost:4000/src/...`; see `vite.config.ts`) after touching styles.

## Implementation plans

- When an implementation plan is needed, create it as a Markdown file under the repository's `docs/` directory.
- Treat implementation plans as local working artifacts: never stage or commit them. If a commit is requested, stage
  only the implementation changes and verify that the plan remains outside the commit.

Do not create a Git commit unless the user explicitly requests one. If requested, use `../git-workflow/SKILL.md`.
