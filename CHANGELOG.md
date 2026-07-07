# Changelog

Format: [Keep a Changelog](https://keepachangelog.com) · Versioning: semver.

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
