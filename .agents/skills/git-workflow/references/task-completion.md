# Task completion checklist

Apply this checklist to a complete behavioral unit, whether reviewing readiness or preparing an authorized commit:

1. Compare the result with the user's requested behavior. Confirm the implementation and necessary regression
   coverage are complete, with no known task regression hidden by a weakened assertion or disabled check.
2. Review the actual unit diff, including tests and untracked files. Exclude secrets, generated noise, unrelated
   work, and local implementation plans. Check both staged and unstaged content for mixed ownership.
3. Select checks from [testing](../../testing/SKILL.md). Preserve exact commands and outcomes; distinguish a task
   failure, an existing failure, and unavailable validation. Do not claim types, tests, or Rust passed from
   `pnpm lint` alone. Pure documentation changes do not require the application's full test suite.
4. Run `git diff --check` and, when using the index, `git diff --cached --check` for task changes. Inspect the final
   commit candidate before committing. Report unrelated existing diagnostics without silently fixing them.
5. After hooks, inspect the committed diff and remaining staged/unstaged changes. Hook auto-fixes can change the
   validated artifact; rerun only checks affected by those changes and report any outstanding failure.

Only explicit commit authorization permits staging or committing. A readiness review must identify blockers and
validation gaps without modifying the index. When several boundaries would materially change the requested
scope, clarify that scope; otherwise choose coherent units directly.
