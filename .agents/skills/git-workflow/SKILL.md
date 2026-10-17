---
name: git-workflow
description: Prepare, review, and create atomic Git commits for TeyvatGuide using its Chinese gitmoji format. Use only when the user explicitly asks to commit changes, split commits, draft commit messages, or review commit readiness.
---

# Git Workflow

## Determine the requested operation

Use this skill for an explicitly requested commit, split plan, message draft, or readiness review. Read
[Git rules](../../rules/git-commit-rules.md) before preparing the result.

A plan, message draft, or readiness review is read-only with respect to Git's index and history. It does not
authorize `git add` or `git commit`. Create commits only when the user explicitly requests them; task completion
and passing validation do not supply that authorization. Preserve existing authorization without asking again.

## Inspect and form complete units

1. Inspect `git status --short`, `git diff`, `git diff --cached`, and relevant untracked files. Record which staged
   and unstaged changes predate the task. A clean working diff does not mean the index is empty.
2. Separate task changes from unrelated work, including mixed changes within one file. Read
   [commit conventions](references/commit-conventions.md) to group by one independently understandable behavior.
   Keep its implementation, necessary configuration, regression tests, and documentation together.
3. Apply [task completion](references/task-completion.md) to each unit. Check the actual diff and run the relevant
   checks from [testing](../testing/SKILL.md). Lint alone is not evidence of functional correctness.
4. For planning or review, return the proposed boundaries/messages and any concrete blockers, then stop without
   staging. For an authorized commit, continue below. Resolve routine boundaries directly; ask only if ownership
   or materially different user intent remains unclear after inspecting the diffs.

## Create an authorized commit

1. Finish and validate one coherent unit before committing it. Stage explicit task paths or selected task hunks;
   never use blanket `git add .` or `git add -A`. Do not stage an entire file containing unrelated user changes.
2. Inspect `git diff --cached --name-status` and the full commit candidate diff. A plain `git commit` includes all
   staged content, so explicitly staging task paths does not by itself exclude pre-existing staged changes. If
   unrelated changes are staged, preserve their index entries and use an isolated commit selection. For files
   wholly owned by this unit, `git commit --only -F <message-file> -- <paths>` can exclude other staged paths, but it commits the
   working-tree contents of the selected files; do not use it for mixed-ownership files. Inspect selected content
   before committing. If a safe hunk selection cannot be established, ask about the ambiguous ownership without
   resetting, stashing, or otherwise rewriting the user's index.
   Selecting task hunks with `git add -p` in the shared index is not isolation from other staged paths. For mixed
   files, the commit and its hooks must see only the task candidate while preserving the user's staged and
   unstaged content. Do not improvise an alternate-index recipe without a reliable way to reconcile the original
   index after HEAD moves. If the available tooling cannot preserve that state, report the exact overlap and ask
   for the needed scope decision rather than falling back to a plain commit.
3. Commit non-interactively using the repository's Chinese Gitmoji format. For a multiline body, write exact text
   to a temporary UTF-8 file and pass it with `git commit -F`; avoid shell interpolation of message content.
4. The pre-commit hook runs `pnpm lint-staged`. Its ESLint, Prettier, Stylelint, and Rustfmt steps can rewrite files.
   Run it against the isolated commit candidate when unrelated content is staged. If it touches unrelated or
   mixed-ownership content, stop and inspect the changes; do not blanket-stage, retry, or undo another actor's work.
   If it fails, inspect both staged and unstaged diffs, fix only task-owned issues, rerun affected checks, and review
   the candidate again before retrying. Never bypass a failed hook with `--no-verify` or disable a check to pass.
5. Inspect `git show --stat --oneline HEAD` and the committed diff after success, then `git status --short` and
   `git diff --cached` to confirm the included unit and preservation of unrelated staged work. If hook fixes alter
   behavior or invalidate earlier evidence, rerun the affected checks and disclose any remaining issue; do not
   silently amend the commit.
6. For multiple units, repeat completion, validation, and commit in dependency order. Avoid a shared temporary
   broken state or commits that merely repair omissions from the preceding unit.

Do not amend, rebase, push, tag, or force-update without separate explicit authorization. Leave implementation
plans under `docs/` outside commits as required by `../teyvat-guide/SKILL.md`; classify documents by their purpose
and content, and do not exclude product documentation merely because it is also Markdown.

Report each created hash, subject, included scope, validation outcomes, and any remaining changes. For a review
without a commit, report readiness and blockers without implying a commit was created.
