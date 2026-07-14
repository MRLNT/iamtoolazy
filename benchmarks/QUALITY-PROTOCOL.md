# Quality protocol — blind pairwise scoring (Fase 4.B)

Token counts say what a condition costs. This protocol says what it
breaks. Both numbers ship together or neither ships.

## What is being tested

For a sampled prompt, does the answer produced under a treated condition
(`iamtoolazy`, ablations, history modes) still solve the task as well as
the `baseline` answer? Style differences are NOT defects; missing
substance is.

## Sampling

- Stratified from one committed live run: **2 records per class per
  language** for single-turn (2 × 4 × 2 = 16 pairs) plus **all 6 history
  records** under `hist-distill` vs `hist-full` → **22 pairs** per scored
  condition.
- Use the first repeat (`n_index = 0`) of each record — no cherry-picking
  the best of N.
- Small honest N: 22 pairs per condition is enough to catch systematic
  breakage, not enough for tight confidence intervals. Say so wherever
  the scores are cited.

## Blinding procedure

1. For each pair, flip a coin (or `hash(id) % 2`) to decide which answer
   is shown as **A** and which as **B**. Record the mapping in a separate
   key file that stays closed until scoring is done.
2. The scoring sheet shows: the original prompt, answer A, answer B —
   never the condition names, never token counts.
3. Score all pairs in one sitting per condition; then open the key file.

## Scoring rubric (per pair)

| verdict | meaning |
|---|---|
| A | A solves the task better (substance, not style) |
| B | B solves the task better |
| tie | both solve it; differences are stylistic |
| both-fail | neither answer solves the task |

Additionally flag, independent of the verdict:
- `missing-caveat` — the terser answer dropped a warning/limitation that
  the fuller answer correctly included;
- `wrong` — an answer contains a factual or technical error (note which).

## Aggregation

Report per condition: win / tie / loss counts against baseline,
`both-fail` count, and the two flag counts, in a table in `RESULTS.md`
next to the token numbers. A condition "passes" the gate when
**losses + missing-caveat flags ≤ 15% of pairs** — and that threshold is
a maintainer judgment call, labeled as such, not a statistical claim.

## Scoring sheet template

```
pair | record id | verdict (A/B/tie/both-fail) | flags | notes
-----|-----------|------------------------------|-------|------
  1  |           |                              |       |
 ... |           |                              |       |
```

## Optional LLM judge

An LLM-judge pass over the same pairs MAY be run for comparison. If it
is: it uses a different model family than the one being benchmarked, its
prompt is committed alongside the results, and every table that includes
its scores carries the label **"LLM-judged — not ground truth"**. It
never replaces the human pass; disagreements between the two are
reported, not resolved silently.
