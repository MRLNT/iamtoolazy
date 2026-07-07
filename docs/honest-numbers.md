# Honest numbers

Token-saving tools have a marketing problem: headline percentages measured
against unusually verbose baselines, on the smallest slice of the bill.
caveman's own repo eventually shipped an "honest number warning" after
community re-benchmarks. iamtoolazy ships the warning **first**.

## What every number in our UI means

- **All counts are estimates.** OpenAI-family counts use `gpt-tokenizer`
  (o200k_base). Anthropic's tokenizer is not public; `claude` numbers apply
  a ×1.15 calibration factor on top and are labeled estimates everywhere.
- **Input delta is shown, never hidden.** PCTF structure and injected
  directives *add* input tokens. The ledger reports
  `predictedNet = predictedOutputSavings − inputDelta`. If a stage would go
  net-negative, the adaptive injector skips it and tells you why.
- **Savings factor is conservative.** We plan with 35% output reduction from
  terse directives — the low end of community re-benchmarks (30–50%) — not
  the 65–75% headline range.

## Where the tokens actually are

In a typical session, prose replies are a small slice. The big pools:

1. **Conversation history**, re-sent as input every turn (web chat).
2. **Generated code** you then re-read for the rest of the session.
3. **Media**: a full-resolution photo can cost more than a page of text.

That is why iamtoolazy's center of gravity is the input side (prompt
compression compounds across every following turn of the thread), media
optimization (resolution down = real vision-token savings), the thread
distiller (reset a bloated history for a one-time cost), and YAGNI code
discipline (less code written now = less code re-read later).

## On subscriptions, "saving tokens" means something specific

On claude.ai / ChatGPT / Gemini subscription plans you don't pay per token.
What you save is **headroom**: more turns before usage limits, longer
threads before context degrades. On API / per-token billing, the savings
are monetary. The UI says which one applies.

## The retry is the hidden cost

A vague prompt that needs one clarifying round trip costs ~2,000–3,000
tokens. The PCTF refiner exists to prevent retries, and it may *increase*
this turn's input tokens to do it. That trade is intentional, visible in
the ledger, and — per a March 2026 arXiv result on brevity constraints and
community turn-count tracking — usually the single biggest real saving.

## Benchmarks

`benchmarks/` will hold reproducible harnesses (Fase 4): fixed prompt sets,
n≥4 runs, medians, raw per-task tables, and a limitations section. No
benchmark, no claim.
