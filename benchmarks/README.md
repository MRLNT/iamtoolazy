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
run.mjs      condition runner with LAZY ablations           (4.A.2 — next)
report.mjs   RESULTS.md generator                           (4.A.3 — planned)
```

## Conditions (defined in docs/master-plan.md, Fase 4.A)

`baseline` · `be-brief` · `static-terse` · `yagni-only` · `iamtoolazy`,
plus LAZY ablations `E1` (no calibration), `E2` (no net-positive guard),
`E3` (fixed budgets), and a history-modes matrix (full history vs
distiller vs delta-context).

## Validating workloads

```
node benchmarks/validate.mjs
```

Also runs as part of `npm test`.
