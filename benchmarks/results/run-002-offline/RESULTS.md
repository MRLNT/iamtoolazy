# Benchmark results — `offline-2026-07-18T13-56-16-041Z`

- mode: **offline** · provider: mock · repeats per record: n=1
- token estimator: **tokenizer** (offline; `*_estimate` fields) — `*_measured` fields come from provider usage
- generated from committed raw JSONL only; this report makes no API calls

## Run notes (verbatim from the runner)

- offline mode: transformations are deterministic — n forced to 1
- offline mode: E1 (no calibration) is identical to iamtoolazy — calibration only learns from live outputs
- offline mode: hist-distill briefs are MODELED at the 400-token cap (ceiling, not a measurement)

## Single-turn conditions — input side

| condition | records | rows | input Δ tokens mean (min…max) | input vs baseline | injected |
|---|---|---|---|---|---|
| baseline | 80 | 80 | 0 (0…0) | +0.0% | 0% |
| be-brief | 80 | 80 | 4.2 (3…6) | +4.4% | 100% |
| E1 | 80 | 80 | 50.1 (0…119) | +52.8% | 93% |
| E2 | 80 | 80 | 54.6 (8…119) | +57.4% | 100% |
| E3 | 80 | 80 | 54.6 (8…119) | +57.4% | 100% |
| iamtoolazy | 80 | 80 | 50.1 (0…119) | +52.8% | 93% |
| static-terse | 80 | 80 | 35.7 (31…41) | +37.5% | 100% |
| yagni-only | 80 | 80 | 51.7 (43…61) | +54.4% | 100% |

*Input Δ is the overhead column: tokens each condition ADDS to (or removes from) every prompt. All values are tokenizer estimates.*

## History modes

| condition | records | rows | input vs full history | modeled rows | one-time distill tokens mean (min…max) | output tokens mean (min…max) |
|---|---|---|---|---|---|---|
| hist-delta | 12 | 12 | -2.0% | 0 | — | — |
| hist-distill | 12 | 12 | -8.4% | 12 | 511.2 (309…786) | — |
| hist-full | 12 | 12 | +0.0% | 0 | — | — |

*"Modeled" rows use the distill-cap ceiling instead of a real brief — a modeled number is never a measurement.*

## Limitations

- Workloads are cleaner than wild prompts (author-written, mostly typo-free; a few informal-register records are the exception, not the rule).
- Input-side numbers use the offline tokenizer; provider tokenizers differ (Claude counts are calibrated estimates).
- Output-side and probe numbers are only meaningful for the specific model of the run; do not generalize across models.
- String-match probe verdicts under-credit paraphrased answers; treat stability flags, not raw pass rates, as the signal.
