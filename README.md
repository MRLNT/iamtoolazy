# iamtoolazy

> Too lazy to waste tokens.

Save input, output, **and** media tokens on Claude, ChatGPT, and Gemini —
in web chat *and* in CLI agents. Free, open source, local-first, MIT.

## Why another token saver?

[caveman](https://github.com/JuliusBrussee/caveman) proved terse output
works. [ponytail](https://github.com/DietrichGebert/ponytail) proved minimal
code works. Both are great — and both leave the biggest pools untouched:

| Token pool | caveman | ponytail | **iamtoolazy** |
|---|---|---|---|
| Output prose | ✅ | — | ✅ adaptive (only when net-positive) |
| Generated code | — | ✅ | ✅ YAGNI, auto-wakes on coding tasks only |
| **Your prompts** (re-sent every turn) | — | — | ✅ compress + PCTF refine |
| **Media** (images, PDFs) | — | — | ✅ downscale / local text extraction |
| **Thread history** | partial (memory files) | — | ✅ distiller + context health |
| Web chat (claude.ai / ChatGPT / Gemini) | — | — | ✅ browser extension |
| Retry prevention | — | — | ✅ PCTF: Persona · Context · Task · Constraints · Format |
| Net-negative guard | ⚠️ ~1–1.5k tok/turn overhead | ⚠️ deliberation cost on terse models | ✅ injects only if predicted savings > overhead |

The philosophy: **fix their weaknesses, keep their strengths, then attack
the pools neither of them touches.** And publish honest numbers from day
one — see [docs/honest-numbers.md](docs/honest-numbers.md).

## How it works (auto mode)

```
your prompt
  → compress   strip greetings/filler/closers — style only, never meaning,
               never code/URLs/quotes (byte-preserved), never translated
  → refine     restructure into PCTF so the model nails it in one shot
               (the retry you prevent is worth ~2–3k tokens)
  → inject     tiny terse/YAGNI directive, ONLY when predicted output
               savings beat the overhead — short question costs zero
  → preview    you see the diff before anything is sent (default on)
```

Works in English and Indonesian out of the box; compression adapts to your
language, it never translates.

## The LAZY method

iamtoolazy's original contribution (reference implementation shipped,
validation in Fase 4 — draft: [docs/paper/lazy-method.md](docs/paper/lazy-method.md)):

- **Learn** — measure the actual token cost of every response, on-device
- **Adapt** — calibrate the injection policy per user and task class
  (EWMA), replacing universal constants with your measured reality
- **Zero-waste** — delta-context compression: never re-send what the
  visible conversation already established (safety-railed, reversible)
- **Yield** — an honest ledger: input deltas shown, skip reasons named,
  realized savings tracked, zero telemetry

## Status

**Fase 1 — core engine: ✅ · v0.2.0 adds the LAZY reference implementation**

```
packages/core        the shared engine (Node ≥18 + browser, ESM)
  compressor         input-side caveman, 3 levels, removal log for diffs
  refiner            local PCTF extractor + task classifier (id/en)
  estimator          gpt-tokenizer when available, honest fallbacks,
                     vision-token math for images
  injector           adaptive terse/YAGNI directives with skip reasons
  delta              LAZY zero-waste: history-aware prompt dedup
  calibrator         LAZY learn/adapt: on-device policy calibration
  distiller          thread → compact brief templates
  llm                optional BYOK refine pass (Anthropic/OpenAI/Gemini)
  pipeline           processPrompt() = the whole auto mode in one call
```

33 tests. See [CHANGELOG.md](CHANGELOG.md).

- **Fase 2** — `packages/cli`: Claude Code / Codex plugin (skill + slash
  commands + memory-file compression + stats)
- **Fase 3** — `packages/extension`: MV3 extension for claude.ai /
  chatgpt.com / gemini.google.com (auto mode, preview diff, media
  optimizer, distiller, onboarding wizard, BYOK, dashboard)
- **Fase 4** — reproducible benchmarks + release polish

## Quick start (core)

```bash
npm install && npm test && npm run demo
```

```js
import { processPrompt, initTokenizer } from '@iamtoolazy/core';

await initTokenizer(); // optional: real token counts instead of heuristic

const r = processPrompt(
  'Hi! Could you please implement a login function with rate limiting in Node? ' +
  'I am building a small internal app. Avoid external auth providers. ' +
  'Show the code with short comments. Thanks!'
);

r.output;             // compressed + PCTF-structured + directive attached
r.tokens.predictedNet // honest ledger: savings minus what we added
r.injection.reason    // why the directive was (or wasn't) attached
```

Every stage is independently toggleable — that's what the install wizard
will expose in Fase 3:

```js
processPrompt(text, {
  compress: true,  compressLevel: 'full',   // lite | full | ultra
  refine: true,    refineMode: 'auto',      // auto | structure | tighten
  inject: true,    enableYagni: true,
  provider: 'claude',                       // openai | claude | generic
});
```

## Principles

1. **Local-first.** Rules run on your machine. The LLM refine pass is
   opt-in, BYOK, and off by default.
2. **Zero telemetry.** No accounts, no analytics, no phone home.
3. **Meaning-safe.** Negations are structurally impossible to remove; code,
   URLs, paths, and quotes are byte-preserved; language is never translated.
4. **Honest numbers.** Estimates labeled as estimates, overhead shown, the
   conservative end of benchmarks used for predictions. No benchmark, no claim.
5. **Lazy by example.** The codebase practices the YAGNI it preaches.

## Credits

Built with respect on the shoulders of two excellent projects:
[caveman](https://github.com/JuliusBrussee/caveman) by Julius Brussee and
[ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert.
iamtoolazy exists because their work proved the ideas — we extend them to
the pools they don't cover.

## License

MIT
