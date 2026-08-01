---
name: teyvat-guide
description: Implement and review changes in the TeyvatGuide Vue, TypeScript, Vuetify, Tauri, Rust, Pinia, and SQLite repository. Use for repository-specific components, pages, API integrations, desktop commands, database work, build configuration, or validation.
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

Do not create a Git commit unless the user explicitly requests one. If requested, use `../git-workflow/SKILL.md`.
