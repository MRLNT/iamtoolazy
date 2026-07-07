# Roadmap

Every phase ships something usable. Research citations at the bottom.

## Fase 1 — Core engine ✅ `v0.1.0` → `v0.2.0`

Shipped: input-side compressor (3 levels, protected spans, removal log),
local PCTF refiner + task classifier (id/en), token estimator (gpt-tokenizer
+ honest fallbacks + vision-token math), adaptive injector with skip
reasons, thread-distiller templates, BYOK LLM adapter, `processPrompt()`
pipeline, 25 tests, demo. **v0.2.0** adds the **LAZY method** reference
implementation — Delta-Context Compression (`delta.js`) + Self-Calibrating
Injection (`calibrator.js`), pipeline/injector wiring, method draft in
`docs/paper/lazy-method.md`, 33 tests.

## Fase 2 — CLI plugin + Injector v2 + repo hygiene

**CLI plugin (Claude Code / Codex):**
combined skill (terse output + YAGNI ladder that wakes only on coding
tasks), `/lazy`, `/lazy-refine`, `/lazy-compress`
(memory-file compression with backup), `/lazy-stats`,
`/lazy-review` — the skill itself is auto-active from session start.

**Injector v2 (research-backed):**
- **Chain-of-Draft directive** for reasoning-class prompts: draft steps of
  ~5 words each — CoD matches or beats CoT accuracy at a fraction of the
  tokens [3].
- **Dynamic token budgets** (TALE-style): append "answer in ≤N tokens"
  where N comes from the classifier's `expectedTokens`; margins respect
  the *token elasticity* finding — budgets set too low backfire and cost
  more [4].
- **Task-aware brevity**: strongest terse constraints on math/science/
  coding (where brevity *improves* accuracy, up to +26pp on large models),
  relaxed for reading-comprehension tasks [5].

**Repo hygiene (hiring-grade):**
GitHub Actions CI (Node 18/20/22 matrix + lint), CONTRIBUTING.md,
SECURITY.md, CODE_OF_CONDUCT.md, issue/PR templates, CHANGELOG.md
(semver, conventional commits), npm publish of `@iamtoolazy/core`
(names verified available).

## Fase 3 — Browser extension (MV3)

Site adapters (claude.ai, chatgpt.com, gemini.google.com + generic
fallback), auto mode with preview diff, image downscale, PDF → local text
extraction (consent-gated), thread distiller + context health meter,
onboarding wizard, BYOK storage, honest stats dashboard.
Plus: **LAZY activation** — the extension closes the calibration loop
(observe actual response tokens, feed the on-device calibrator) and feeds
conversation history to the delta stage.
Plus: **PRIVACY.md + THREAT-MODEL.md** — least-privilege permissions,
local-only storage, explicit answers to "is this extension reading my
chats?" — written to a security-professional standard.

## Fase 4 — Honest benchmarks + launch

- Reproducible harness vs four baselines: no tool, a one-line "be brief"
  instruction, caveman, ponytail. n≥4 runs, medians, raw per-task tables,
  limitations section. No benchmark, no claim.
- **LAZY validation**: ablations E1–E3 from the method draft (DCC only,
  SCI only, frozen savings factor) vs baselines incl. the one-line
  "be brief" — then finalize the paper for submission.
- Mini paper-reproduction eval (BYOK, GSM8K subset) validating the CoD and
  TALE directives against their published numbers.
- Interactive playground on GitHub Pages — core runs fully in-browser.
- Local-only stats export (opt-in shareable JSON; still zero telemetry).
- Technical launch write-up.

## Fase 5 — Smart Compress + scale

- **LLMLingua-2 local** (ONNX, optional separate download): ML token-drop
  compression targeting long pasted contexts where rules barely help —
  up to 20x compression with little performance loss in the LLMLingua
  line [1][2]; the multilingual encoder covers Indonesian.
- Language packs: compressor/refiner rules as data files so the community
  can add languages without touching code.
- TypeScript declarations, property-based tests for the mask/unmask and
  never-remove-negation invariants.

## References

1. LLMLingua — arXiv:2310.05736 (EMNLP 2023)
2. LLMLingua-2 — https://llmlingua.com (Microsoft Research)
3. Chain of Draft: Thinking Faster by Writing Less — arXiv:2502.18600
4. Token-Budget-Aware LLM Reasoning (TALE) — arXiv:2412.18547 (ACL 2025 Findings)
5. Brevity Constraints Reverse Performance Hierarchies in Language Models — arXiv:2604.00025
