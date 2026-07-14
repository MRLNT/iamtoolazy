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

## Fase 2 — CLI plugin + Injector v2 + repo hygiene ✅ `v0.3.0` ✅ `v0.3.0`

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
GitHub Actions CI (Node 18/20/22 matrix + vendor-drift check), CONTRIBUTING,
SECURITY, CODE_OF_CONDUCT, issue/PR templates, CHANGELOG. Shipped: the
plugin is fully self-contained (core vendored via `npm run sync:cli`,
enforced by CI). Remaining manual step: `npm publish` of
`@iamtoolazy/core` (names verified available).

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

## Fase 4 — Honest benchmarks + launch ✅ `v0.6.0`

Shipped: frozen benchmark workloads (86 records, EN+ID, multi-turn
histories with QA probes), runner with 8 conditions + LAZY ablations
(E1 no-calibration / E2 no-guard / E3 fixed-budget) + history modes,
offline/dry-run/live with mandatory cost projection, report generator
(mean ± min/max, instability flags, the input-overhead column), blind
pairwise quality protocol, **run 1 committed** (offline, input-side,
$0 — decision record in master-plan), paper §5.1–5.2 with deviations
and findings incl. negative results, in-browser playground on Pages,
launch drafts. Deferred by decision: live output-side run (run 2, behind
the dry-run cost gate), GSM8K reproduction, restatement-heavy history
records (append-only additions before any DCC-scoring run).

## Fase 5 — Smart Compress + scale

- **LLMLingua-2 local** (ONNX, optional separate download): ML token-drop
  compression targeting long pasted contexts where rules barely help —
  up to 20x compression with little performance loss in the LLMLingua
  line [1][2]; the multilingual encoder covers Indonesian.
- Language packs: compressor/refiner rules as data files so the community
  can add languages without touching code.
- Firefox port of the extension (MV3 WebExtensions parity is close;
  blocked on nothing technical — recorded as backlog per Fase 3.H).
- TypeScript declarations, property-based tests for the mask/unmask and
  never-remove-negation invariants.

## References

1. LLMLingua — arXiv:2310.05736 (EMNLP 2023)
2. LLMLingua-2 — https://llmlingua.com (Microsoft Research)
3. Chain of Draft: Thinking Faster by Writing Less — arXiv:2502.18600
4. Token-Budget-Aware LLM Reasoning (TALE) — arXiv:2412.18547 (ACL 2025 Findings)
5. Brevity Constraints Reverse Performance Hierarchies in Language Models — arXiv:2604.00025
