---
description: Over-engineering review of the current diff — one line per finding
argument-hint: "[staged | HEAD~1 | a file path]"
---
Review scope: $ARGUMENTS (default: `git diff` if dirty, else `git diff HEAD~1`).

Read the diff, then report ONLY over-engineering findings, one line each:
`<file>:<line> — <what to delete/simplify> → <simpler alternative>`

Look for: unrequested abstractions, dependencies where stdlib works,
config for things that never vary, dead flexibility, wrapper layers,
premature generalization. If the diff is already minimal, output exactly:
`clean. nothing to remove.` — do not invent findings to seem useful.
Correctness issues are out of scope unless deletion would break something,
in which case say so in the same line.
