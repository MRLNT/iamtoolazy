# 🦥 iamtoolazy

> Too lazy to waste tokens. So lazy, it even skips itself when that's cheaper.

[![ci](https://github.com/MRLNT/iamtoolazy/actions/workflows/ci.yml/badge.svg)](https://github.com/MRLNT/iamtoolazy/actions)
[![release](https://img.shields.io/github/v/release/MRLNT/iamtoolazy)](https://github.com/MRLNT/iamtoolazy/releases)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)](package.json)

![iamtoolazy demo](assets/demo.gif)

Save input, output, **and** media tokens on Claude, ChatGPT, and Gemini —
with honest numbers, zero telemetry, and a method that only acts when
acting is cheaper than doing nothing. Works in English and Indonesian.

## Which one do I install?

| You are… | Install | Status |
|---|---|---|
| **A Claude Code user** | The plugin — 2 commands, ~30 seconds, below ⬇️ | ✅ **available now** |
| **A claude.ai / ChatGPT / Gemini web user** | The browser extension | 🔜 Fase 3 — ⭐ star to get notified |
| **A JS developer** | `npm i @iamtoolazy/core` library | ✅ available now |

That's it. One repo, three doors, pick yours.

## Install the Claude Code plugin

Inside any Claude Code session:

```
/plugin marketplace add MRLNT/iamtoolazy
/plugin install lazy@iamtoolazy
```

Restart when prompted. From now on:

- Every prompt is classified on your machine (coding / reasoning / prose / q&a)
- A tiny directive is attached **only when predicted savings beat its cost**
  — short questions cost exactly **zero**
- Reasoning gets [Chain-of-Draft](https://arxiv.org/abs/2502.18600), coding
  gets the YAGNI ladder, everything except prose gets a token budget with
  an elasticity floor ([TALE](https://arxiv.org/abs/2412.18547))
- A Stop hook measures real response lengths and calibrates future
  decisions to *your* usage — all data stays in `~/.iamtoolazy/`

Commands (Claude Code namespaces them as `plugin:command` — type `/lazy`
and autocomplete finishes the rest): `/lazy:on [lite|full|ultra]` ·
`/lazy:off` · `/lazy:status` · `/lazy:stats` · `/lazy:refine <prompt>` ·
`/lazy:compress [file]` · `/lazy:review`. Full details in
[packages/cli](packages/cli/README.md). Uninstall anytime with
`/plugin uninstall lazy@iamtoolazy`.

## Why another token saver?

[caveman](https://github.com/JuliusBrussee/caveman) proved terse output
works. [ponytail](https://github.com/DietrichGebert/ponytail) proved
minimal code works. Both are static policies — and both leave the biggest
pools untouched:

| Token pool | caveman | ponytail | **iamtoolazy** |
|---|---|---|---|
| Output prose | ✅ | — | ✅ adaptive (only when net-positive) |
| Generated code | — | ✅ | ✅ YAGNI, wakes on coding tasks only |
| **Your prompts** (re-sent every turn) | — | — | ✅ compress + PCTF refine |
| **Media** (images, PDFs) | — | — | 🔜 Fase 3: downscale / local text extraction |
| **Thread history** | partial | — | ✅ distiller + delta-context compression |
| Web chat (claude.ai / ChatGPT / Gemini) | — | — | 🔜 Fase 3 extension |
| Retry prevention | — | — | ✅ PCTF: Persona · Context · Task · Constraints · Format |
| Net-negative guard | ⚠️ ~1–1.5k tok/turn overhead | ⚠️ deliberation cost | ✅ skips itself, with the reason logged |
| Learns your usage | — | — | ✅ LAZY on-device calibration |

## The LAZY method

Our original contribution (reference implementation shipped; validation in
Fase 4 — draft: [docs/paper/lazy-method.md](docs/paper/lazy-method.md)):

- **Learn** — measure the actual token cost of every response, on-device
- **Adapt** — calibrate the injection policy per user and task class (EWMA)
- **Zero-waste** — never re-send what the conversation already established
- **Yield** — an honest ledger: input deltas shown, skip reasons named

## Library quick start

```bash
npm i @iamtoolazy/core
```

```js
import { processPrompt, initTokenizer } from '@iamtoolazy/core';

await initTokenizer(); // optional: real token counts instead of chars/4
const r = processPrompt(
  'Hi! Could you please implement login with rate limiting? ' +
  'I am building a small app. Avoid external providers. Thanks!'
);
r.output;                 // compressed + PCTF-structured + directive attached
r.tokens.predictedNet;    // the honest ledger
r.injection.reason;       // why it did (or didn't) act
```

Every stage is independently toggleable: `compress` (lite/full/ultra),
`refine` (auto/structure/tighten), `inject` (terse/CoD/YAGNI/budget),
`history` (delta-context), `calibration`.

## Status

- **Fase 1–2 ✅** — core engine + LAZY reference implementation + Claude
  Code plugin + CI + community docs (`v0.3.0`, 37 tests)
- **Fase 3 🔜** — browser extension (MV3): auto mode with preview diff,
  image downscale, PDF→text, thread distiller, onboarding wizard
- **Fase 4** — reproducible benchmarks vs caveman / ponytail / a one-line
  "be brief" — plus the LAZY ablation study and paper finalization
- **Fase 5** — LLMLingua-2 local Smart Compress, community language packs,
  TypeScript declarations

Full roadmap: [docs/roadmap.md](docs/roadmap.md)

## Honest numbers, or it didn't happen

Every count in our UI is labeled an estimate. Input overhead is shown,
never hidden. Predictions use the *low* end of community re-benchmarks.
No benchmark, no claim. The whole policy: [docs/honest-numbers.md](docs/honest-numbers.md)

```
        (\_/)
        (-.-) zzz     ← the mascot, conserving tokens
       c(")(")
```

## Credits

Built with respect on the shoulders of two excellent projects:
[caveman](https://github.com/JuliusBrussee/caveman) by Julius Brussee and
[ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert.
iamtoolazy exists because their work proved the ideas — we extend them to
the pools they don't cover.

## License

MIT. Made with minimal effort, *by design*.
