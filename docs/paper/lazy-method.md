# LAZY: Learn, Adapt, Zero-waste, Yield — A Client-Side, Provider-Agnostic Policy for Token-Efficient LLM Chat

**Draft v0.1 (pre-submission) — evaluation section pending Fase 4 results. Not yet submitted anywhere.**

Author: Marcel (iamtoolazy maintainer) · Reference implementation: `@iamtoolazy/core` v0.5.x

## Abstract

Existing token-efficiency tools for LLM assistants either compress model
output style (caveman), constrain generated code (ponytail), or compress
prompts with server-side ML (LLMLingua). All apply *static, universal*
policies, and none exploit the two signals uniquely visible at the chat
client: the conversation the model has already seen, and the actual cost
of every response. We propose **LAZY**, a four-stage client-side policy:
**Zero-waste** delta-context compression drops only prompt content the
visible conversation has already established; **Learn/Adapt**
self-calibrating injection replaces universal constants (expected response
length, brevity savings factor) with per-user, per-task-class online
estimates (EWMA), deciding to attach brevity/budget directives only when
measured expected savings exceed measured overhead; **Yield** is an honest
ledger that reports input deltas, predicted and realized savings, and every
skip reason. LAZY is provider-agnostic (it transforms prompt text only),
runs entirely on-device with zero telemetry, and degrades gracefully: with
no history and no observations it reduces exactly to a conservative static
policy. We describe the method, its safety rails, a reference
implementation, and a pre-registered evaluation design against four
baselines including a one-line "be brief" instruction.

## 1. Introduction

Token efficiency for LLM chat has been attacked at three layers: output
style (terse-response skills), generated-artifact size (minimal-code
rulesets), and prompt compression (perplexity- or classifier-based token
dropping). Community re-benchmarks of the most popular style tool found
its whole-session savings far below headline numbers, partly because the
directive itself costs input tokens on every turn — a *static* policy
cannot know when it is net-negative. Meanwhile, web-chat users pay the
largest hidden costs at the input side: history is re-sent every turn, and
users restate established context.

Two observations motivate LAZY. First, the chat client — a browser
extension or CLI wrapper — *sees the conversation*, so redundancy of a new
prompt is computable against what the model already has, with no model
access. Second, the client *sees every response*, so the constants that
static policies guess (how long will the reply be? how much does a brevity
directive save?) are measurable per user and per task class.

Contributions: (1) Delta-Context Compression (DCC), a safety-railed,
client-side redundancy filter over new prompts relative to visible
dialogue; (2) Self-Calibrating Injection (SCI), an online-calibrated
decision rule for attaching brevity/budget directives; (3) an honest
measurement ledger and a pre-registered evaluation design; (4) an
open-source reference implementation.

## 2. Related Work

**Prompt compression.** LLMLingua achieves up to 20x compression with
small performance loss using a small LM and budget control; LLMLingua-2
reframes compression as token classification distilled from GPT-4 [1,2].
These compress arbitrary text with ML; DCC is complementary — a zero-model,
zero-cost filter that removes only *conversationally redundant* content
and never touches task, negation, numeric, or code spans.

**Efficient reasoning.** Chain of Draft matches or surpasses CoT accuracy
using as little as 7.6% of reasoning tokens by capping step length [3].
TALE shows a well-chosen token budget in the prompt compresses reasoning,
and that budgets set too low backfire ("token elasticity") [4]. Brevity
constraints improve large-model accuracy by up to 26pp, with math/science
benefiting most [5]. LAZY treats these as *directives in a library* whose
deployment is governed by calibrated cost/benefit, and whose class-level
application follows the task-aware findings of [5].

**Tooling.** caveman (output-style compression) and ponytail
(minimal-code discipline) are static skills; both acknowledge overhead or
deliberation costs on terse workloads. LAZY's decision layer is designed
precisely to eliminate that failure mode.

## 3. The LAZY Method

Pipeline per user turn: `delta → compress → refine → inject`, followed by
`observe` after the response arrives.

### 3.1 Zero-waste: Delta-Context Compression

Let S be the visible conversation and p the new prompt, split into
sentences. For sentence s with content-word set W(s) (stopwords removed),
coverage c(s) = |W(s) ∩ W(S)| / |W(s)|. Drop s iff c(s) ≥ τ (default
0.85) **and** none of the safety rails hold: s contains a protected span
(code/URL/path/quote), a negation, a leading task verb, or a number absent
from S. The transform is previewable and reversible client-side; worst
case (empty history) is the identity.

### 3.2 Learn/Adapt: Self-Calibrating Injection

For task class k, maintain EWMA estimates over observed response lengths:
μ̂ₖ (non-injected turns) and μ̂ₖᴵ (injected turns), each with sample count.
With ≥ m samples (default 3): expected length Êₖ = μ̂ₖ and savings factor
f̂ₖ = clamp(1 − μ̂ₖᴵ/μ̂ₖ, 0.15, 0.6). Inject directive d iff
Êₖ ≥ floor **and** Êₖ·f̂ₖ > overhead(d) · margin. Below m samples the
static defaults apply, so cold start equals the conservative baseline.
Directive library: terse [5], Chain-of-Draft for reasoning classes [3],
and TALE-style budgets "answer in ≤ N tokens" with N = Êₖ·(1−f̂ₖ) bounded
away from the elasticity regime [4].

**Stated approximation.** Per-turn counterfactuals are unobservable; f̂ₖ
compares populations within a class and assumes rough comparability. This
is clamped, surfaced in the ledger, and the target of ablation E3.

### 3.3 Yield: the honest ledger

Every turn reports: input token delta (structure and directives *add*
input tokens — never hidden), predicted savings, realized response tokens,
calibration status, and skip reasons. All token counts are labeled
estimates (Anthropic's tokenizer is not public; a documented ×1.15
calibration on o200k counts is used).

## 4. Reference Implementation

`@iamtoolazy/core` v0.2 (MIT): `delta.js` (DCC), `calibrator.js` (SCI
state; plain-JSON serializable), `injector.js` (calibrated decision),
`pipeline.js` (orchestration). 33 unit tests cover the safety rails,
cold-start equivalence, JSON round-trip, and a measured-yes flip that a
static policy would miss.

## 5. Planned Evaluation (pre-registered design)

**Baselines:** (B0) no tool; (B1) one-line "be brief"; (B2) caveman;
(B3) ponytail; (B4) iamtoolazy static v0.1. **Treatment:** LAZY (A+B).
**Ablations:** E1 DCC only, E2 SCI only, E3 SCI with frozen f̂ (tests the
population-comparability assumption). **Workloads:** multi-turn chat
suites (id/en) with deliberate context restatement; GSM8K subset for
directive validation against [3,4]. **Metrics:** input/output tokens per
task, task success, turn count, net ledger. **Protocol:** n≥4 runs,
medians, raw per-task tables published; limitations section mandatory.

### 5.1 Deviations from the pre-registered design

The shipped harness (Fase 4.A, `benchmarks/`) deviates from the design
above in five documented ways. All predate the analysis of run 1 except
(5), which run 1 itself surfaced.

1. **Protocol upgraded** (2026-07-09): N=5 repeats with mean ± min/max
   spread replaces n≥4 medians; probes whose verdict flips across
   repeats are flagged unstable and counted neither way.
2. **Third-party baselines replaced by in-repo reimplementations.** B2
   (caveman) and B3 (ponytail) are benchmarked as `static-terse` and
   `yagni-only` — the same directive styles, pinned in this repo —
   because external repos change under our feet and their savings claims
   were re-benchmarked downward by independent tests during Fase 4.
3. **Ablations redefined.** E1 = no calibration, E2 = no net-positive
   guard, E3 = fixed budgets. The pre-registered set isolated components;
   the shipped set stress-tests LAZY's safety rails, which is the
   sharper question.
4. **GSM8K subset dropped** — outside the zero-cost scope of run 1.
5. **Workloads were authored WITHOUT deliberate context restatement**,
   contrary to the design above. Run 1's DCC result (F4) exposed this;
   restatement-heavy history records will be *appended* (workloads are
   append-only) before any run that scores DCC.

### 5.2 Run 1 — measured input-side results (offline, zero API cost)

**Setup.** 86 frozen workload records (80 single-turn across
coding/reasoning/qa/writing × EN+ID; 6 multi-turn histories), run
committed at `a801ed6` with raw JSONL and the rendered report in
`benchmarks/results/run-001-offline/`. Token counts use the offline
o200k tokenizer (deterministic; Claude counts would apply a calibration
factor). Transformations are deterministic, so n=1; no API calls were
made and no output-side metric exists in this run.

| condition | mean input Δ (tokens) | vs baseline | injected |
|---|---|---|---|
| baseline | 0 | +0.0% | 0% |
| be-brief (one-liner) | +4.2 | +4.4% | 100% |
| static-terse | +35.7 | +37.5% | 100% |
| yagni-only | +51.7 | +54.4% | 100% |
| **iamtoolazy (full)** | **+50.1** | **+52.8%** | **93%** |
| E2 (guard off) | +54.6 | +57.4% | 100% |
| E3 (fixed budgets) | +54.6 | +57.4% | 100% |

**F1 — directive overhead dominates single-turn input.** On prompts
averaging 95 tokens, the full pipeline ADDS +50.1 input tokens on
average; in 0 of 80 records did compression savings exceed directive
cost. The one-line "be brief" baseline costs 12× less input. Under
LAZY's own ledger, single-turn value therefore rests entirely on
output-side savings — which run 1, by scope, does not measure. We state
this plainly rather than let the input column imply the opposite.

**F2 — the net-positive guard functions.** It skipped 6/80 prompts
(the terse and short-expected ones) and lowered mean overhead relative
to guard-off E2. The margin is small on this workload because most
prompts classify as directive-worthy; the guard's value concentrates
exactly where tools like static-terse go net-negative.

**F3 — the thread distiller is the strongest measured saver.** On 6–8
turn histories (631-token mean), distilling cuts re-sent input by 192
tokens per turn (−30.5%) against a one-time distill cost of ~663
tokens: break-even after ≈3.4 turns. The brief is modeled at its
400-token cap — a ceiling, so real break-even may come earlier — and
per-turn savings grow with thread length, making these short workloads
a floor scenario.

**F4 — DCC dropped zero sentences in all six histories.** The authored
final prompts contain no restatement, so run 1 neither validates nor
falsifies delta-context compression. This is a workload-design finding
(deviation 5), reported as-is.

**F5 — the input-overhead column is the point.** Community
re-benchmarks of static tools found their headline savings eroded by
unreported input overhead; here that overhead is a first-class measured
column (+37.5% to +57.4% across always-inject conditions) from day one.

### 5.3 Run 2 — closing the DCC gap (offline, zero API cost)

F4 of run 1 reported that delta-context compression dropped nothing,
because the authored final prompts contained no restatement. Six
restatement-heavy history records were **appended** (workloads are
append-only; the run-1 records are untouched and its numbers stand) with
deliberately graded restatement — light (one restating sentence), medium
(two), heavy (three) — in EN and ID. Run 2 is committed at
`benchmarks/results/run-002-offline/`.

| record group | records | sentences dropped | records with a drop | input vs full history |
|---|---|---|---|---|
| run-1 records (no restatement) | 6 | 0 | 0 | 0.0% |
| run-2 records (restatement) | 6 | 8 | 5 | −5.6% |
| run-2 records, active only | 5 | 8 | 5 | −7.0% (−3.9…−9.9%) |

**F6 — DCC works, and its effect size is small and conditional.** On
prompts that restate established context it removes 3.9–9.9% of the
re-sent input; on prompts that do not, it correctly does nothing. Both
halves matter: a compressor that fires on non-redundant text would be
dangerous, and one that never fires would be dead weight. The honest
summary is not a headline percentage but a conditional: *DCC pays only
for users who restate, and those users exist.*

**F7 — the discourse marker that signals restatement defeats the
detector.** `history-id-04` restates two established facts but scored
0.846 coverage against a 0.85 threshold and survived. The cause is
instructive: the phrase "Seperti saya sebutkan tadi" ("as I mentioned
earlier") introduces content words that are *absent* from the history,
lowering lexical coverage — the very marker announcing redundancy is
what pushes the sentence under the bar. Treating restatement markers as
stop-words is an obvious fix and is recorded as future work rather than
applied here: tuning a threshold against a benchmark authored in the
same week would be fitting the tool to its own exam.

**F8 — the distiller has a lower bound, previously invisible.** Run 1's
histories were 532–744 tokens, all above the 400-token brief cap, so
distilling always won. The shorter run-2 histories (284–391 tokens) fall
*below* the cap, and there distilling **costs** 17.7–55.3% more input
than simply re-sending the thread. The break-even is structural, not
tunable: replacing a history with a brief only pays once the history
exceeds the brief. The extension should therefore not offer 🧵 Distill
on short threads at all — a guard the benchmark demanded before any user
complained.

## 6. Limitations & Ethics

**Effect sizes are small and workload-shaped.** DCC's 3.9–9.9% applies
only to restating prompts, on a 6-record corpus authored by the
maintainer; treat it as existence proof, not as a population estimate.

**Future work made concrete by run 2.** (a) Treat restatement discourse
markers as stop-words in DCC coverage (F7) and measure the change on a
corpus authored *before* the fix. (b) Gate the thread distiller on
history length so it is never offered below break-even (F8). (c) Live
run for output-side payback, E1, and probe stability.

**Output-side effects are unmeasured by decision.** Run 1 was executed
under a zero-API-spend scope (decision record in `docs/master-plan.md`);
directive payback, calibration ablation (E1), and probe stability
require a live run and remain open. Distill numbers use a modeled brief
ceiling, not a measured brief. Workloads are cleaner than wild prompts
(author-written, mostly typo-free, three informal-register records).

Token counts are estimates for some providers. DCC's word-overlap
redundancy can miss paraphrase (future: local embeddings). SCI's savings
factor rests on a stated population assumption. Calibration data never
leaves the device; the evaluation uses no human-subject data and only
opt-in, locally exported ledgers. A formal novelty/literature check
precedes any submission.

## 7. Conclusion

LAZY turns token saving from a static guess into a measured, per-user
policy using only signals available at the chat client — making it
applicable to any AI chat, closed or open.

## References

[1] Jiang et al., *LLMLingua*, EMNLP 2023, arXiv:2310.05736.
[2] Pan et al., *LLMLingua-2*, 2024, https://llmlingua.com.
[3] Xu et al., *Chain of Draft: Thinking Faster by Writing Less*, arXiv:2502.18600.
[4] Han et al., *Token-Budget-Aware LLM Reasoning*, ACL 2025 Findings, arXiv:2412.18547.
[5] Hakim, *Brevity Constraints Reverse Performance Hierarchies in Language Models*, arXiv:2604.00025.
