<p align="center">
  <img src="assets/logo.png" width="120" alt="iamtoolazy — a koala conserving tokens">
</p>

# 🐨 iamtoolazy

> Too lazy to waste tokens. So lazy, it even skips itself when that's cheaper.

[![ci](https://github.com/MRLNT/iamtoolazy/actions/workflows/ci.yml/badge.svg)](https://github.com/MRLNT/iamtoolazy/actions)
[![release](https://img.shields.io/github/v/release/MRLNT/iamtoolazy)](https://github.com/MRLNT/iamtoolazy/releases)
[![npm](https://img.shields.io/npm/v/%40iamtoolazy%2Fcore)](https://www.npmjs.com/package/@iamtoolazy/core)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

![iamtoolazy demo](assets/demo.gif)

## What is this?

Every message you send to Claude, ChatGPT, or Gemini costs **tokens** —
that's your quota, your rate limit, or your money. Most prompts carry
filler the model never needed ("Hi! Could you please maybe…"). And most
AI replies are longer than you wanted.

**iamtoolazy trims that waste automatically, without changing what you
mean** — and shows you honest numbers about what it did (and what it
deliberately skipped).

## What you get

- ✂️ **Prompt compression** — "Hi! Could you please fix this bug? Thanks
  so much!!" → "Fix this bug." Same request, fraction of the tokens.
- 🛡 **Meaning-safe by design** — code, URLs, file paths, numbers, and
  negations ("don't", "never") are *never* touched. Tested, not promised.
- 🧠 **Smart, not blind** — it classifies each prompt and acts **only when
  saving beats the cost**. Short prompts cost exactly zero. It even
  learns your real usage on-device and calibrates itself (the LAZY method).
- 🧾 **The honest ledger** — every number is labeled an estimate, every
  overhead is shown, every skip is explained. No inflated marketing math.
- 🔒 **100% local** — zero telemetry, no accounts, no data leaves your
  machine. Ever.
- 🌏 **English + Bahasa Indonesia**, more languages coming (Fase 5).

## Pick your door

| You are… | Install | Time |
|---|---|---|
| **A Claude Code user** | The plugin ⬇️ | ~30 sec |
| **A claude.ai / ChatGPT / Gemini user** | The browser extension (beta) ⬇️ | ~2 min |
| **A JS developer** | `npm i @iamtoolazy/core` ⬇️ | ~30 sec |

### Door 1 — Claude Code plugin

Inside any Claude Code session:

```
/plugin marketplace add MRLNT/iamtoolazy
/plugin install lazy@iamtoolazy
```

Run `/reload-plugins` when prompted — done. It introduces itself once,
then works silently: every prompt is classified on your machine and a
tiny saving directive is attached **only when it's worth it**. Try
`/lazy:help` for the menu, `/lazy:stats` for your ledger, `/lazy:off` to
pause. Details: [packages/cli](packages/cli/README.md).

### Door 2 — Browser extension (beta)

Works on **claude.ai**, **chatgpt.com**, and **gemini.google.com**.
Web Store listing is in review; until then, two ways in:

**Easy way (no build tools):** grab
[`iamtoolazy-extension-v0.6.1.zip` from the latest release](https://github.com/MRLNT/iamtoolazy/releases/latest),
unzip it, then: `chrome://extensions` → enable **Developer mode**
(top-right) → **Load unpacked** → select the unzipped folder. A welcome
tab opens with a 30-second hands-on tour.

**Dev way (from source):**

```bash
git clone https://github.com/MRLNT/iamtoolazy && cd iamtoolazy
npm install && npm run build:ext
```

then Load unpacked → the `packages/extension` folder.

**How to use it:** press **Alt+L** (**⌥L** on Mac) in the chat box → a
preview diff shows exactly what gets trimmed → **Apply**. Attach a big
image and a pill offers to downscale it before upload; PDF→text lives in
Options (off by default); the popup's 🧵 **Distill** shrinks long
threads. Privacy: [PRIVACY.md](PRIVACY.md) ·
[THREAT-MODEL.md](THREAT-MODEL.md) — zero network, zero telemetry.
Details: [packages/extension](packages/extension/README.md).

#### Platform support

| Surface | Status |
|---|---|
| claude.ai | ✅ supported |
| chatgpt.com | ✅ supported |
| gemini.google.com | ✅ supported |
| Claude Code (plugin) | ✅ supported |
| Any tool importing `@iamtoolazy/core` | ✅ supported |
| Firefox (same extension, MV3 port) | 🔜 planned |
| More chat surfaces (e.g. Copilot, Mistral, DeepSeek, Perplexity, Grok, Poe, OpenWebUI) | 🔜 wanted — see below |

**On adding surfaces.** The compression engine is provider-agnostic
already; a new surface needs only a selector adapter (find the composer,
read it, write it back) plus that provider's token-cost quirks, if any.
That is deliberately a small, well-scoped contribution — the honest catch
is that each one needs *field testing* on a real account before it ships,
and shipping an adapter that silently mangles prompts would be worse than
not shipping it. So the list above is a wanted-list, not a promise with
dates. If a surface matters to you, open an issue saying which one and
whether you can help test it; that is the signal that moves it up.

### Door 3 — The library

```bash
npm i @iamtoolazy/core
```

```js
import { processPrompt, initTokenizer } from '@iamtoolazy/core';
await initTokenizer(); // optional: real token counts instead of chars/4
const r = processPrompt('Hi! Could you please implement login? Thanks!');
r.output;               // compressed + structured + directive attached
r.tokens.predictedNet;  // the honest ledger
r.injection.reason;     // why it acted — or why it refused to
```

## How it works (60 seconds)

1. **Classify** — coding / reasoning / prose / q&a, detected locally.
2. **Act only when net-positive** — compression and tiny directives
   (research-backed: [Chain-of-Draft](https://arxiv.org/abs/2502.18600),
   [TALE budgets](https://arxiv.org/abs/2412.18547)) are attached only
   when predicted savings beat their own cost. Otherwise: zero touch.
3. **Learn** — response lengths are measured on your device and future
   decisions calibrate to *your* usage. That loop is our original
   contribution, the **LAZY method** (Learn · Adapt · Zero-waste ·
   Yield): [docs/paper/lazy-method.md](docs/paper/lazy-method.md).
4. **Show the receipt** — the ledger prints savings *and* overhead,
   labeled as estimates until the Fase 4 benchmarks replace them with
   measured numbers.

## FAQ

## Try it in 10 seconds (no install)

**[Playground →](https://mrlnt.github.io/iamtoolazy/playground/)** — paste a
prompt, watch the pipeline print its honest receipt. Runs entirely in your
browser; nothing leaves the page.

**Does my data go anywhere?** No. Everything runs locally; there is no
server, no telemetry, no account. There is no BYOK or network feature in
the extension — every feature is free and offline by construction (an
early BYOK experiment was built, field-tested, and removed on purpose).

**Will it change my meaning?** It refuses to touch code, URLs, paths,
numbers, and negations — enforced by tests, and structurally impossible
to remove in the compressor. When in doubt, it keeps your wording.

**How much does it save?** Measured, input side (run 1, offline,
committed in `benchmarks/results/run-001-offline/`): the thread
distiller cuts re-sent history by ~30% on 6–8-turn threads, breaking
even after ~3–4 turns (modeled ceiling — longer real threads save
more). On short single prompts the injected directives *cost* about +50
input tokens on average — a deliberate bet that they save more on the
output side, which is **not yet measured** (run 1 spent zero on APIs;
the honest ledger nets this per prompt and skips when it can't win).
Raw JSONL, spreads, and limitations ship with every number.

**Why "lazy"?** Because the cheapest token is the one never sent — and
the smartest tool is the one that knows when doing nothing is optimal.

**Is it free?** MIT. Forever.

## vs caveman & ponytail

[caveman](https://github.com/JuliusBrussee/caveman) proved terse output
works; [ponytail](https://github.com/DietrichGebert/ponytail) proved
minimal code works. Both are static policies. iamtoolazy covers the
pools they don't — your prompts (re-sent every turn), media, thread
history — adds a net-negative guard with logged skip reasons, and
calibrates to you. Full comparison + roadmap:
[docs/master-plan.md](docs/master-plan.md).

## Status

**Live now:** core on npm · Claude Code plugin · extension beta with
Alt+L. **Next:** preview diff (3.C) → dashboard + BYOK (3.D) → history &
media savers (3.E–F) → Web Store (3.H) → measured benchmarks + paper +
playground (Fase 4) → smart compress + language packs + 1.0 (Fase 5).

```
        ʕ -ᴥ- ʔ zzz     ← the mascot, conserving tokens
```

## Credits

Built with respect on the shoulders of two excellent projects:
[caveman](https://github.com/JuliusBrussee/caveman) by Julius Brussee and
[ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich
Gebert. iamtoolazy exists because their work proved the ideas.

## License

MIT. Made with minimal effort, *by design*.
