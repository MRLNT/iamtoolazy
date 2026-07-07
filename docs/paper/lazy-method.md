# LAZY: Learn, Adapt, Zero-waste, Yield — A Client-Side, Provider-Agnostic Policy for Token-Efficient LLM Chat

**Draft v0.1 (pre-submission) — evaluation section pending Fase 4 results. Not yet submitted anywhere.**

Author: Marcel (iamtoolazy maintainer) · Reference implementation: `@iamtoolazy/core` v0.2

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

## 6. Limitations & Ethics

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
