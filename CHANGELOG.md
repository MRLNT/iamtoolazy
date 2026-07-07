# Changelog

Format: [Keep a Changelog](https://keepachangelog.com) · Versioning: semver.

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
