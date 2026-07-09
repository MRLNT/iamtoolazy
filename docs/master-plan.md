# iamtoolazy — Master Plan: Fase 3 → v1.0.0

This is the complete, sequential path from today (v0.4.0: core on npm,
Claude Code plugin live) to v1.0.0. Each sub-fase follows the rhythm that
shipped Fase 1–2:

> **build & test in a sandbox → delta zip + step guide → layered commits
> → push → CI green → live-test → report → next sub-fase.**

Two kinds of work are marked honestly throughout: **[sandbox-verifiable]**
(tests/lint/smoke prove it before it ships) and **[needs live testing]**
(browser DOM, real LLM APIs, store review — verified by the maintainer in
the field, iterated as needed).

Version map: **Fase 3 → v0.5.0** (browser extension beta) ·
**Fase 4 → v0.6.0** (benchmarks, paper, playground) ·
**Fase 5 → v1.0.0** (smart compress, language packs, TypeScript).

---

## FASE 3 — Browser Extension (MV3) → `v0.5.0`

Goal: the biggest audience. Everyone using claude.ai, chatgpt.com, or
gemini.google.com in a browser gets prompt compression with a preview
diff, media savings, and the honest ledger — all local, zero telemetry.

### 3.0 Mascot & identity ✅ (shipped with this plan)
Koala logo (PIL pixel art, generated — `scripts/make-logo.py`), MV3 icon
set 16/32/48/128, README header + mascot swap.

### 3.A Scaffold & build pipeline  [sandbox-verifiable]
- **Files:** `packages/extension/manifest.json` (MV3; content scripts for
  the three sites; permissions: `storage` only — rationale documented),
  `src/background.js` (minimal service worker), `src/content.js` (entry),
  `src/options.html/js`, `src/popup.html/js`, `esbuild` devDep +
  `npm run build:ext` bundling `@iamtoolazy/core` from the workspace into
  `packages/extension/dist/`.
- **Verify:** bundle compiles in CI; `dist/` loads as an unpacked
  extension; icon appears in the toolbar.
- **Commits:** `feat(extension): MV3 scaffold and build pipeline` ·
  `chore(ci): build the extension bundle in CI`
- **Maintainer role:** load unpacked via `chrome://extensions` →
  Developer mode → Load unpacked → `packages/extension`.

### 3.B Site adapters  [needs live testing]
- **Files:** `src/adapters/{claude,chatgpt,gemini}.js` implementing one
  interface: `detect() / getInput() / setInput(text) / onBeforeSend(cb)`;
  `src/adapters/index.js` picks by hostname; a debug badge shows which
  adapter attached.
- **Resilience by design:** selectors WILL rot as sites update. Two
  fallbacks ship from day one: (1) a manual hotkey (Alt+L) that processes
  the focused input without needing send-interception, and (2) adapter
  self-checks that fail silently to "off" with a badge warning instead of
  breaking the page.
- **Verify:** pure-logic unit tests for the interface; live checks on all
  three sites by the maintainer, iterated per report.
- **Commits:** `feat(extension): site adapter interface + claude.ai adapter` ·
  `feat(extension): chatgpt.com adapter` · `feat(extension): gemini adapter` ·
  `feat(extension): Alt+L manual fallback`

### 3.C Preview-diff overlay & modes  [needs live testing]
- **Files:** `src/ui/diff.js` (overlay showing exactly what compression
  removed, color-coded; Approve / Edit / Skip), `src/pipeline.js` wiring
  `processPrompt()` with per-site settings; modes: **preview (default)** /
  auto / off, stored in `chrome.storage.local`.
- **Meaning-safety in UI:** protected spans render in a "locked" style so
  users see code/URLs/numbers were untouched.
- **Commits:** `feat(extension): preview diff overlay` ·
  `feat(extension): per-site modes (preview/auto/off)`

### 3.D Popup dashboard, onboarding wizard, BYOK  [sandbox + live]
- **Files:** popup = the honest ledger (reuse stats logic; per-site and
  total, estimates labeled); 3-step first-run wizard (what it does → pick
  mode per site → where data lives); options page with BYOK key fields
  (Anthropic/OpenAI/Gemini) used ONLY for the opt-in LLM refine pass —
  stored in `chrome.storage.local`, never logged, never sent anywhere but
  the provider the user chose.
- **Commits:** `feat(extension): ledger popup` ·
  `feat(extension): first-run wizard` · `feat(extension): BYOK refine (opt-in)`

### 3.E History savers: delta-context + distiller  [needs live testing]
- **Files:** per-tab session memory; DCC (`delta.js`) drops sentences the
  thread already established before send; a "Distill thread" action
  generates the compact context block for starting a fresh chat.
- **Commits:** `feat(extension): delta-context compression on send` ·
  `feat(extension): thread distiller action`

### 3.F Media savers  [needs live testing]
- **Files:** image downscale interceptor (canvas resize before upload,
  savings shown via `estimator.resizeSavings`, always confirm-first);
  PDF→text extraction behind an explicit consent toggle (bundles
  `pdfjs-dist` — adds ~1 MB to the bundle; documented honestly, off by
  default).
- **Commits:** `feat(extension): image downscale with savings preview` ·
  `feat(extension): consent-gated PDF text extraction`

### 3.G Privacy & threat documentation  [sandbox-verifiable]
- **Files:** `PRIVACY.md` (what is stored, where, what never leaves the
  machine), `THREAT-MODEL.md` (assets, adversaries, mitigations —
  including "prompt data is sensitive by definition"), permissions
  rationale table in the extension README.
- **Commits:** `docs: privacy policy and threat model` — a deliberate
  hiring-signal artifact.

### 3.H Beta release v0.5.0  [live]
- CI builds and attaches `iamtoolazy-extension-v0.5.0.zip` to the
  Release; README gains "Install the extension (beta)" with unpacked
  instructions; Chrome Web Store checklist executed by the maintainer
  (one-time $5 developer fee, listing copy drafted from README,
  screenshots generated by script); Firefox port recorded as backlog.
- **Commits:** `chore(ci): attach extension zip to releases` ·
  `docs: extension install (beta)` ·
  `chore(release): v0.5.0 — changelog, versions, roadmap`
- Tag `v0.5.0`, Release title: `v0.5.0 — Browser Extension (beta)`.

---

## FASE 4 — Proof: Benchmarks, Paper, Playground → `v0.6.0`

Goal: replace every "should save" with a measured number, publish the
LAZY method with real results, and let people try the engine in 10
seconds without installing anything.

> **Methodology upgrade (adopted 2026-07-09):** no single-run claims,
> ever. Every condition runs **N times (default 5)** and reports
> **mean ± min/max spread**; token metrics use the offline tokenizer
> (deterministic, zero API cost); fidelity is verified with QA probes on
> early-turn facts across the N runs, and any probe whose verdict flips
> between runs is flagged as unstable; CI only renders committed results
> — never live API calls.

### 4.A Benchmark harness  [sandbox-verifiable]
- **Files:** `benchmarks/workloads/*.jsonl` (coding / reasoning / qa /
  writing × EN + ID, ~10 prompts each); `benchmarks/run.mjs` — conditions:
  `baseline`, `be-brief` (one-liner), `static-terse` (caveman-style),
  `yagni-only` (ponytail-style), `iamtoolazy` (full adaptive), plus LAZY
  ablations `E1` (no calibration), `E2` (no net-positive guard), `E3`
  (fixed budgets); BYOK via env vars; N repeats; outputs raw JSONL +
  cost/token deltas; repeat-run support (`--n 5`) built into the runner;
  a **history-modes workload** (full history vs distiller vs
  delta-context, exercising the 3.E features) joins the four task
  classes; `benchmarks/report.mjs` renders `RESULTS.md` with means,
  spreads, stability flags, and the input-overhead column nobody else
  prints.
- **Commits:** `feat(bench): workloads` · `feat(bench): runner with
  ablations` · `feat(bench): report generator`

### 4.B Quality gate  [live]
- Blind pairwise protocol (does the terse answer still solve the task?),
  small honest N, scored by the maintainer; optional LLM-judge run is
  labeled as such and never presented as ground truth.
- **Commit:** `docs(bench): quality protocol and scoring sheet`

### 4.C Run & publish  [live — needs API keys, cost estimate given first]
- Maintainer runs the matrix (a dry-run prints projected API cost before
  anything is spent), commits raw results + `RESULTS.md`; README numbers
  updated to measured values.
- **Commits:** `bench: results run 1 (raw + report)` ·
  `docs: README numbers now measured, not predicted`

### 4.D Paper finalization  [sandbox + decision]
- Fill the evaluation section of `docs/paper/lazy-method.md` with 4.C
  results and limitations. Publication fork, decided then: arXiv
  (requires endorsement) **or** repo-paper + long-form technical blog
  post. Both paths documented; neither blocks v0.6.0.
- **Commit:** `docs(paper): evaluation and limitations from run 1`

### 4.E Playground + launch  [sandbox + live]
- **Files:** `docs/playground/` (static GitHub Pages site: paste a
  prompt → see compress/refine/inject + the ledger live, 100% in-browser,
  no keys, no server); Pages workflow; README link.
- Launch checklist: Show HN draft, r/ClaudeAI + r/LocalLLaMA posts, X
  thread — all drafted in `docs/launch/` for the maintainer to fire.
- **Commits:** `feat(playground): in-browser demo on Pages` ·
  `docs(launch): announcement drafts` ·
  `chore(release): v0.6.0 — changelog, versions, roadmap`
- Tag `v0.6.0`, Release: `v0.6.0 — Measured: benchmarks, paper, playground`.

---

## FASE 5 — Smart Compress & 1.0 → `v1.0.0`

### 5.A LLMLingua-2 spike → decision gate  [sandbox first, honesty first]
- Reality: LLMLingua-2's multilingual model is XLM-RoBERTa-based;
  quantized ONNX is still hundreds of MB. The spike measures actual size,
  load time, and in-browser feasibility via onnxruntime-web.
- **Gate outcomes (documented either way):** (a) optional downloadable
  model pack, off by default, extension + CLI; (b) CLI-only; (c) deferred
  with a written finding. No silent overpromising.
- **Commits:** `spike(smart-compress): llmlingua-2 onnx feasibility` →
  then either `feat(core): smart-compress (optional model pack)` or
  `docs: smart-compress decision record`

### 5.B Community language packs  [sandbox-verifiable]
- **Files:** JSON pack schema (openers/fillers/closers/negation guards
  per language), loader in `compressor.js`, CONTRIBUTING section "add
  your language in one JSON file + tests", seed packs (es, pt) explicitly
  labeled *machine-drafted, needs native review*.
- **Commits:** `feat(core): language pack loader` · `feat(lang): es + pt
  seed packs (need native review)` · `docs: how to contribute a language`

### 5.C TypeScript declarations  [sandbox-verifiable]
- Handwritten `packages/core/index.d.ts` (the API is small), verified
  with `tsc --noEmit` in CI, `types` field in package.json.
- **Commits:** `feat(core): TypeScript declarations` ·
  `chore(ci): type-check job`

### 5.D v1.0.0  [sandbox + live]
- Version sweep to 1.0.0 (root, core, plugin, extension, marketplace),
  README final pass, SECURITY re-read, npm publish
  `@iamtoolazy/core@1.0.0`, Release `v1.0.0 — the lazy way to save`,
  announcement using 4.E drafts.

---

## Definition of Done (v1.0.0)

1. A web-chat user, a Claude Code user, and a JS developer can each
   install their door in under a minute — and the README's first screen
   routes them correctly.
2. Every savings number a user sees is measured or labeled an estimate;
   input overhead is always visible; skips are explained.
3. Benchmarks are reproducible from the repo with one command and a key.
4. The LAZY method paper contains real results and honest limitations.
5. Zero telemetry, keys never leave the user's machine, and PRIVACY.md /
   THREAT-MODEL.md say exactly how.

## Risk register

| Risk | Mitigation |
|---|---|
| Site DOM changes break adapters | Alt+L manual fallback, fail-to-off badges, adapters isolated per site |
| LLMLingua model too heavy for browser | Decision gate 5.A with documented outcomes; never default-on |
| Chrome Web Store review friction | Minimal permissions (`storage` only), privacy docs ready, beta via unpacked/Release zip meanwhile |
| Benchmark API cost | Dry-run cost projection before any spend; small-N first |
| Solo-maintainer bandwidth | Every sub-fase is independently shippable; the plan tolerates pauses |

## Backlog (post-v1.0)

- **`@iamtoolazy/variance`** — generalize the Fase 4 repeat-run machinery
  into a standalone harness: run any agentic task N times, diff outcomes,
  score stability. Re-validate the gap before starting.
- **Firefox port** of the extension.
