# Changelog

Format: [Keep a Changelog](https://keepachangelog.com) · Versioning: semver.

## [0.6.1] — 2026-07-18

**Bug-fix release.** Three correctness bugs in the compression core, all
surfaced by playground field testing. They affected the extension too, so
anyone on 0.6.0 should update.

### Fixed
- **Protected spans could leak a placeholder.** A URL (or filename) inside
  a quoted string nested two mask placeholders; the single-pass unmask
  restored only the outer one, so e.g. `fetch('https://…/1841')` came back
  as `fetch('\u00000\u0000')`. Unmask now restores to a fixpoint. This
  broke the core "URLs/code survive byte-for-byte" guarantee — the most
  important fix here. (regression test added)
- **Bare greetings got a directive.** "halo"/"hi" classified as `other`
  with the default 350-token estimate, passing the net-positive guard and
  bloating a 1-token greeting to ~37 tokens while claiming savings. Short
  no-task prompts (≤3 words, `other`) are now floored so the guard skips
  them — the honest ledger's whole point. (regression test added)
- **English closers with stacked modifiers weren't stripped.** "Thanks so
  much in advance" combined two modifiers the pattern allowed only singly,
  so it survived compression and the refiner then promoted it to the front
  of the prompt. Pattern now allows stacked modifiers, matching the
  Indonesian closer behavior. (regression test added)

### Changed
- Version bump to 0.6.1 (extension + core); rebuilt playground bundle.

## [0.6.0] — 2026-07-15

**Measured: benchmarks, paper, playground.** Zero-network and free-for-
users rules unchanged; this release also spent zero on APIs (decision
record in docs/master-plan.md).

### Added
- Benchmark harness (`benchmarks/`): 86 frozen JSONL workload records
  (coding/reasoning/qa/writing × EN+ID + multi-turn histories with QA
  probes), schema validator, runner with 8 conditions + LAZY ablations
  (E1/E2/E3) + history modes, offline/dry-run/live modes with mandatory
  cost projection, report generator (mean ± min/max, instability flags,
  input-overhead column), blind pairwise quality protocol (4.B)
- **Run 1 results committed** (`benchmarks/results/run-001-offline/`):
  input-side measured — distiller −30.5% per turn (break-even ≈3.4
  turns, modeled ceiling); full pipeline +52.8% input on short single
  prompts (output-side payback deliberately unmeasured at $0 scope)
- Paper: §5.1 deviations from the pre-registered design, §5.2 run 1
  results with findings F1–F5, expanded limitations
- **Playground** on GitHub Pages (`docs/playground/`): paste a prompt,
  read the honest receipt — 100% in-browser, no server, no keys
- Launch drafts in `docs/launch/` (Show HN, r/ClaudeAI, r/LocalLLaMA, X)

### Changed
- README savings numbers are now measured, not predicted; stale BYOK
  FAQ line removed (BYOK was deleted in 0.5.0)
- Benchmarks methodology finalized: N-repeat mean ± spread, offline
  tokenizer for input metrics, CI renders committed results only
- Extension version bump to 0.6.0 — **version bump only, no functional
  extension changes since 0.5.0** (keeps the release zip name truthful)

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
