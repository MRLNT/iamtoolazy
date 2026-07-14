# Benchmarks — Fase 4

Reproducible or it didn't happen.

## Methodology (adopted 2026-07-09)

- **No single-run claims, ever.** Every condition runs **N times
  (default 5)** and reports **mean ± min/max spread**.
- **Token metrics are offline.** Input-side deltas use the repo's
  offline tokenizer — deterministic and zero API cost, so input-overhead
  numbers can be measured before a single API call is made.
- **Fidelity via QA probes.** History conditions are checked with probes
  on early-turn facts across the N runs; any probe whose verdict flips
  between runs is flagged **unstable**, not counted either way.
- **CI renders committed results only.** No workflow ever makes a live
  API call; `RESULTS.md` is generated from raw JSONL committed to the
  repo.
- Raw per-task tables are committed; a limitations section is mandatory
  in every published report.

## Layout

```
workloads/   frozen prompt sets — see workloads/SCHEMA.md   (4.A.1 ✅)
validate.mjs workload schema validator (runs in npm test)   (4.A.1 ✅)
test/        node:test suites for the benchmark tooling     (4.A.1 ✅)
run.mjs      condition runner with LAZY ablations           (4.A.2 ✅)
providers.mjs mock (sandbox) + anthropic (BYOK) providers    (4.A.2 ✅)
results/     raw run output (committed at 4.C, not before)
report.mjs   RESULTS.md generator                           (4.A.3 ✅)
QUALITY-PROTOCOL.md  blind pairwise scoring protocol         (4.B ✅ doc)
```

## Conditions (defined in docs/master-plan.md, Fase 4.A)

`baseline` · `be-brief` · `static-terse` · `yagni-only` · `iamtoolazy`,
plus LAZY ablations `E1` (no calibration), `E2` (no net-positive guard),
`E3` (fixed budgets), and a history-modes matrix (full history vs
distiller vs delta-context).

## Running the benchmark

```
node benchmarks/run.mjs                                   # offline: input metrics, zero cost
node benchmarks/run.mjs --mode dry-run --n 5 --price-in <per-MTok>   # project cost, spend nothing
node benchmarks/run.mjs --mode live --provider anthropic --model <id> --n 5
```

Useful flags: `--conditions baseline,iamtoolazy` · `--filter coding-en`
(substring on record ids) · `--out <dir>` · `--distill-cap 400`.

Live mode is BYOK via the `ANTHROPIC_API_KEY` env var; the key never
appears in results or logs. Always run `--mode dry-run` first — no live
matrix should ever be started without seeing its projected cost.

Offline-mode honesty notes (printed by the runner itself): E1 equals
`iamtoolazy` offline because calibration only learns from live outputs,
and `hist-distill` briefs are modeled at the distill cap (a ceiling),
never presented as measurements.

## Rendering a report

```
node benchmarks/report.mjs --in benchmarks/results/<run-id>
```

Writes `RESULTS.md` inside the run directory from committed JSONL only —
the report never makes API calls. Offline reports carry the runner's
honesty notes verbatim and refuse to fake an output-side section.

## Validating workloads

```
node benchmarks/validate.mjs
```

Also runs as part of `npm test`.
