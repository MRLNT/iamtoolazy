# Changelog

Format: [Keep a Changelog](https://keepachangelog.com) · Versioning: semver.

## [0.5.0] — 2026-07-12

First public beta of the **browser extension** (MV3) for claude.ai,
chatgpt.com, and gemini.google.com.

### Added
- Alt+L (⌥L) with per-site modes: **preview** (editable diff: removed /
  repeated-context / protected), **auto** with Undo, **off**
- Delta-context session memory: sentences the conversation already
  established are trimmed on later turns (per tab, in-memory only)
- 🧵 Distill-this-thread button (EN/ID) in the popup
- Media savers, confirm-first: image downscale with per-provider token
  math (Claude ~1092px ceiling; Gemini 768-tile formula from the
  official docs; chatgpt.com honestly gets no offer — OpenAI rescales
  server-side), and consent-gated PDF→text extraction via a bundled,
  lazy-loaded pdf.js (double consent, file never uploads)
- Local-processing guardrails with honest messaging (image 40 MB;
  PDF 25 MB / 300 pages — oversized files always pass through)
- First-run wizard with a hands-on "Try it right now" step, popup
  how-to strip, honest ledger dashboard (estimates, capped at 200
  entries, numbers only — never text)
- `PRIVACY.md` and `THREAT-MODEL.md` (including the pdf.js
  CVE-2024-4367 analysis and mitigations)
- Release CI: tagged builds attach a load-unpacked-ready extension zip

### Changed
- BYOK/AI-refine removed from the extension entirely: the extension is
  **zero-network** by construction (`host_permissions` deleted); LLM
  refine remains available in the library only

### Fixed
- Session memory now fills on every Alt+L (remember-on-intent), and the
  current prompt is excluded from its own delta history (turn 2 no
  longer reads "already lean")

## [0.3.1] — 2026-07-07

### Changed — BREAKING for plugin users
- Plugin renamed `iamtoolazy` → `lazy`, and the `lazy-` filename prefix is
  gone: commands are now `/lazy:on`, `/lazy:off`, `/lazy:status`,
  `/lazy:stats`, `/lazy:refine`, `/lazy:compress`, `/lazy:review`
  (previously `/iamtoolazy:lazy-*` — the plugin name said "lazy" twice).
  Reinstall: `/plugin uninstall iamtoolazy@iamtoolazy` →
  `/plugin marketplace update iamtoolazy` → `/plugin install lazy@iamtoolazy`.
- The npm library `@iamtoolazy/core` is unaffected and stays at 0.3.0.

### Fixed
- Prompt hook no longer fires on slash commands, bash mode (`!`), or
  memory notes (`#`) — the ledger and calibration only see real prompts
- `stats`/`status`/`on`/`off` commands no longer echo the tool output a
  second time

## [0.4.0] — 2026-07-07

### Changed
- **Plugin renamed `iamtoolazy` → `lazy`** so namespaced commands are
  short: `/lazy:stats`, `/lazy:on`, `/lazy:off`, … Install string is now
  `/plugin install lazy@iamtoolazy`. (Renamed before any external users.)
- Toggle split into discoverable micro-commands: `on`, `off`, `status`,
  `level` — plus `help` as an in-tool menu
- Docs now show the real namespaced invocations (the bare `/lazy` form
  never existed in Claude Code)

### Added
- First-run onboarding: a SessionStart hook introduces the plugin exactly
  once (recommended defaults, where data lives, how to turn it off)
- `/lazy:help` command

### Fixed
- Slash commands are excluded from the hook: they no longer pollute the
  ledger, pay overhead, or skew calibration
- `/lazy:stats` no longer repeats its own output

`@iamtoolazy/core` is unchanged — no npm publish for this release.

## [0.3.0] — 2026-07-07

### Added
- **`lazy` plugin for Claude Code** (install: `/plugin marketplace add MRLNT/iamtoolazy` → `/plugin install lazy@iamtoolazy`):
  - Adaptive `UserPromptSubmit` hook — task-aware directive injection with
    zero-cost skips and a local ledger (`~/.iamtoolazy/ledger.jsonl`)
  - `lazy-mode` skill (always-on response policy) and commands `/lazy`,
    `/lazy-stats`, `/lazy-refine`, `/lazy-compress`, `/lazy-review`
  - Fully self-contained: core vendored via `npm run sync:cli` (Claude Code
    caches plugin dirs; CI fails on vendor drift)
- **Injector v2 (research-backed)**: Chain-of-Draft directive for
  reasoning-class prompts [arXiv:2502.18600], TALE-style token budgets
  with elasticity guard [arXiv:2412.18547], task-aware brevity — prose
  deliverables get budget-only [arXiv:2604.00025]; `reasoning` task class
- Repo hygiene: GitHub Actions CI (Node 18/20/22 + vendor-drift job),
  CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, issue/PR templates
- README rebuilt around a "Which one do I install?" decision table
- 4 new tests (37 total)

## [0.3.1] — 2026-07-07

### Changed — BREAKING for plugin users
- Plugin renamed `iamtoolazy` → `lazy`, and the `lazy-` filename prefix is
  gone: commands are now `/lazy:on`, `/lazy:off`, `/lazy:status`,
  `/lazy:stats`, `/lazy:refine`, `/lazy:compress`, `/lazy:review`
  (previously `/iamtoolazy:lazy-*` — the plugin name said "lazy" twice).
  Reinstall: `/plugin uninstall iamtoolazy@iamtoolazy` →
  `/plugin marketplace update iamtoolazy` → `/plugin install lazy@iamtoolazy`.
- The npm library `@iamtoolazy/core` is unaffected and stays at 0.3.0.

### Fixed
- Prompt hook no longer fires on slash commands, bash mode (`!`), or
  memory notes (`#`) — the ledger and calibration only see real prompts
- `stats`/`status`/`on`/`off` commands no longer echo the tool output a
  second time

## [0.4.0] — 2026-07-07

### Changed
- **Plugin renamed `iamtoolazy` → `lazy`** so namespaced commands are
  short: `/lazy:stats`, `/lazy:on`, `/lazy:off`, … Install string is now
  `/plugin install lazy@iamtoolazy`. (Renamed before any external users.)
- Toggle split into discoverable micro-commands: `on`, `off`, `status`,
  `level` — plus `help` as an in-tool menu
- Docs now show the real namespaced invocations (the bare `/lazy` form
  never existed in Claude Code)

### Added
- First-run onboarding: a SessionStart hook introduces the plugin exactly
  once (recommended defaults, where data lives, how to turn it off)
- `/lazy:help` command

### Fixed
- Slash commands are excluded from the hook: they no longer pollute the
  ledger, pay overhead, or skew calibration
- `/lazy:stats` no longer repeats its own output

`@iamtoolazy/core` is unchanged — no npm publish for this release.

## [0.3.0] — 2026-07-07

### Added
- **Claude Code plugin** (`packages/cli`): adaptive UserPromptSubmit hook
  (preference-framed directives, only when net-positive), Stop-hook LAZY
  calibration, honest ledger in `~/.iamtoolazy/`, and five commands —
  `/lazy`, `/lazy-refine`, `/lazy-compress`, `/lazy-stats`, `/lazy-review`
- Plugin marketplace manifest: install with
  `/plugin marketplace add MRLNT/iamtoolazy` → `/plugin install iamtoolazy@iamtoolazy`
- **Injector v2** (research-backed): Chain-of-Draft directive for reasoning
  prompts, TALE-style token budgets with a double elasticity guard
  (≥50% of expected, ≥120 floor), task-aware brevity (prose gets a budget
  only), new `reasoning` class in the classifier
- Repo hygiene: GitHub Actions CI (Node 18/20/22 + lint), ESLint flat
  config, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, issue/PR templates
- `@iamtoolazy/core` prepared for npm (metadata, files, publishConfig)
- README overhaul: install matrix, badges, animated demo (original asset)

### Changed
- 37 tests (up from 33)

## [0.2.0] — 2026-07-07

### Added
- **LAZY method reference implementation** (Learn · Adapt · Zero-waste · Yield):
  - `delta.js` — Delta-Context Compression: drops prompt sentences already
    established by the visible conversation, with hard safety rails
    (protected spans, negations, task verbs, unseen numbers are never dropped)
  - `calibrator.js` — Self-Calibrating Injection state: on-device EWMA of
    actual response tokens per task class; JSON-serializable; clamped
    savings factor; cold start identical to static policy
  - Pipeline `history` option (delta stage) and `calibration` passthrough;
    injector accepts calibrated overrides and reports `calibrated` flag
- Method draft: `docs/paper/lazy-method.md` (pre-submission, evaluation pending)
- 8 new tests (33 total)

### Changed
- Slash-command scheme shortened to `/lazy*`; YAGNI marker comment is now `lazy:`
- Credits wording clarified to remove ambiguity

## [0.1.0] — 2026-07-06

### Added
- Core engine: input-side compressor (3 levels, byte-preserved protected
  spans, removal log), local PCTF refiner + task classifier (id/en), token
  estimator (gpt-tokenizer + honest fallbacks + vision-token math),
  adaptive injector with skip reasons, thread-distiller templates, BYOK
  LLM adapter, `processPrompt()` pipeline, demo, 25 tests
- Docs: README, honest-numbers, roadmap
