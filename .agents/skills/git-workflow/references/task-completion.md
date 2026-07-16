# Task completion checklist

Before committing:

1. Confirm the requested behavior is complete and no known error remains.
2. Inspect the staged diff and verify it contains no secrets, generated noise, or unrelated user changes.
3. Run checks proportional to the touched files:
   - TypeScript/Vue types: `pnpm lint-vue`
   - Code: `pnpm lint:code`
   - Styles: `pnpm lint:style`
   - Rust formatting: `cargo fmt --check` from `src-tauri`
   - Broad change: `pnpm lint`
4. Recheck `git status --short` after hooks run.
5. If a check cannot run, disclose it rather than claiming success.

When several commit boundaries are reasonable and the user's intent would materially differ, present the proposed
split before committing.
