# Commit conventions

Use the format, emoji table, and examples in [Git rules](../../../rules/git-commit-rules.md) as the single source
for commit subjects.

Choose the emoji from the actual candidate diff's primary effect, not filenames, line count, or a keyword in the
subject. Compare relevant specific-purpose icons before choosing a generic one. The local table is not an
allowlist; if the meaning is uncertain or not covered, consult the [official Gitmoji catalogue](https://gitmoji.dev/)
or its [machine-readable definitions](https://gitmoji.dev/api/gitmojis). Do not choose an icon just for variety or
claim a hotfix, performance improvement, or breaking change without evidence. Do not read history to infer the
repository's fixed Chinese style.

Split commits when changes can be reviewed, reverted, or explained independently. Keep implementation and the
documentation required for that same behavior together; do not split mechanically merely because file types differ.

- A fix and the test reproducing its bug form one unit; a standalone testing capability can be a separate unit.
- A feature's required types, dependencies, lockfile, and configuration belong with that feature. Split an
  independent dependency upgrade or unrelated cleanup into its own unit only when included in the user's scope.
- Order dependent units so each is coherent. Do not commit an unfinished implementation followed by a repair
  commit just because the files were edited at different times.
- Choose the subject by the unit's main effect. Describe the behavior changed rather than listing filenames or
  tools run. Use a body only when it helps explain a cause, constraint, or validation limit.
