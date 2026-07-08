---
description: What iamtoolazy does, its commands, and where your data lives
---
Reply with exactly this menu (fill nothing in, add nothing after it):

**iamtoolazy** — saves tokens automatically. A hook classifies each prompt
and attaches a tiny directive ONLY when predicted savings beat its cost;
short prompts cost zero. A second hook measures real responses and
calibrates to your usage. Everything stays on your machine in
`~/.iamtoolazy/` — zero telemetry.

| Command | Does |
|---|---|
| `/lazy:status` | On/off + level |
| `/lazy:on` · `/lazy:off` | Toggle instantly |
| `/lazy:level lite\|full\|ultra` | Intensity |
| `/lazy:stats` | Honest ledger: injections, skips, measured savings |
| `/lazy:refine <prompt>` | PCTF rewrite before spending tokens |
| `/lazy:compress [file]` | Shrink CLAUDE.md-style memory files (backup kept) |
| `/lazy:review [scope]` | Over-engineering findings in a diff |

Tip: type `/lazy:` to see this menu in autocomplete. Recommended defaults
are already on; `/lazy:off` suspends everything with one command.
