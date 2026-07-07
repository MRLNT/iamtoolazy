# iamtoolazy — Claude Code plugin

Adaptive token saving for Claude Code: tiny terse/YAGNI/Chain-of-Draft
directives with token budgets, injected **only** when they save more than
they cost, plus on-device LAZY calibration that learns your real response
lengths. Zero telemetry — everything lives in `~/.iamtoolazy/`.

## Install (inside Claude Code)

```
/plugin marketplace add MRLNT/iamtoolazy
/plugin install iamtoolazy@iamtoolazy
```

Restart the session when prompted. Done — the plugin is now active on
every prompt, and skips itself automatically when injecting would cost
more than it saves (short questions cost exactly zero).

## Commands

| Command | What it does |
|---|---|
| `/lazy on\|off\|lite\|full\|ultra\|status` | Toggle or set intensity |
| `/lazy-refine <prompt>` | Rewrite a prompt into PCTF before spending tokens on it |
| `/lazy-compress [file]` | Compress CLAUDE.md-style memory files (backup kept) — input tokens saved on every future turn |
| `/lazy-stats` | The honest ledger: injections, skips, measured calibration |
| `/lazy-review [scope]` | Over-engineering review of a diff, one line per finding |

## How the adaptive part works

- **UserPromptSubmit hook** classifies your prompt (coding / reasoning /
  writing / qa / …), predicts response length, and attaches a directive
  only when predicted savings > overhead × 1.5. Reasoning gets
  Chain-of-Draft, coding gets the YAGNI ladder, everything except prose
  gets a token budget with an elasticity floor.
- **Stop hook** measures the actual response and updates per-class EWMA
  calibration on your machine — over time the decisions use *your*
  numbers, not universal guesses.
- `/lazy off` disables everything instantly; state is one JSON file.

## Uninstall

```
/plugin uninstall iamtoolazy@iamtoolazy
```

Optionally delete `~/.iamtoolazy/` (ledger + calibration).
