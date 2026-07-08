# iamtoolazy — Claude Code plugin (`lazy`)

Adaptive token saving for Claude Code: tiny terse/YAGNI/Chain-of-Draft
directives with token budgets, injected **only** when they save more than
they cost, plus on-device LAZY calibration that learns your real response
lengths. Zero telemetry — everything lives in `~/.iamtoolazy/`.

## Install (inside Claude Code)

```
/plugin marketplace add MRLNT/iamtoolazy
/plugin install lazy@iamtoolazy
```

Run `/reload-plugins` (or restart) when prompted. On your first session
the plugin introduces itself once — active with recommended defaults —
and from then on it works silently: every prompt is classified on your
machine, and directives are attached only when net-positive. Short
questions cost exactly zero.

## Commands

Claude Code namespaces plugin commands as `/<plugin>:<command>` — the
plugin is named `lazy`, so everything is short. Type `/lazy:` to see the
whole menu in autocomplete.

| Command | What it does |
|---|---|
| `/lazy:help` | This menu, inside Claude Code |
| `/lazy:status` | On/off + level |
| `/lazy:on` · `/lazy:off` | Toggle instantly |
| `/lazy:level lite\|full\|ultra` | Intensity |
| `/lazy:stats` | The honest ledger: injections, skips, measured calibration |
| `/lazy:refine <prompt>` | Rewrite a prompt into PCTF before spending tokens on it |
| `/lazy:compress [file]` | Compress CLAUDE.md-style memory files (backup kept) |
| `/lazy:review [scope]` | Over-engineering review of a diff, one line per finding |

## How the adaptive part works

- **UserPromptSubmit hook** classifies your prompt (coding / reasoning /
  prose / q&a), predicts response length, and attaches a directive only
  when predicted savings > overhead × 1.5. Reasoning gets
  Chain-of-Draft, coding gets the YAGNI ladder, everything except prose
  gets a token budget with an elasticity floor. Slash commands are
  ignored entirely — they never touch the ledger.
- **Stop hook** measures the actual response and updates per-class EWMA
  calibration on your machine — over time the decisions use *your*
  numbers, not universal guesses.
- **SessionStart hook** speaks exactly once (first session) to orient
  you, then never again.

## Uninstall

```
/plugin uninstall lazy@iamtoolazy
```

Optionally delete `~/.iamtoolazy/` (ledger + calibration).
