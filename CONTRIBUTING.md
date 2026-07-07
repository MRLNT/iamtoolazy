# Contributing

Thanks for helping people waste fewer tokens. The bar for merging:

1. **Tests pass, lint clean.** `npm ci && npm test && npm run lint`
2. **Honest numbers.** Any savings claim in code, docs, or PR description
   must be an estimate labeled as one, or come with a reproducible measurement.
3. **YAGNI applies to us too.** The simplest change that works wins review.
   New dependencies need a one-line justification in the PR.
4. **Meaning-safety is non-negotiable.** Changes to the compressor/delta
   must keep the invariants: protected spans byte-preserved, negations
   never removed, language never translated — with tests proving it.
5. **Conventional commits** (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

Good first contributions: compressor/refiner rules for a new language
(they're regex data + tests), benchmark workloads, site adapters (Fase 3).

By contributing you agree your work is MIT-licensed.
