---
name: git-workflow
description: Prepare, review, and create atomic Git commits for TeyvatGuide using its Chinese gitmoji format. Use only when the user explicitly asks to commit changes, split commits, draft commit messages, or review commit readiness.
---

# Git Workflow

1. Confirm the user requested a Git commit or commit-planning action. Do not infer permission from task completion.
2. Read `../../rules/git-commit-rules.md` and inspect `git status --short` plus the relevant diffs.
3. Separate user-owned pre-existing changes from the task changes. Never stage unrelated files.
4. Run the smallest sufficient checks for each proposed commit. Read
   [task completion](references/task-completion.md) for the checklist.
5. Group changes by one coherent behavior or purpose. Read
   [commit conventions](references/commit-conventions.md) when choosing messages or boundaries.
6. Stage explicit paths and commit non-interactively. Do not amend, rebase, push, tag, or force-update unless
   the user separately requests it.
7. Report the commit hash, subject, included paths, and validation result.

If hooks fail, inspect the failure and fix only issues within task scope. Ask before expanding scope or including
unrelated user changes.
