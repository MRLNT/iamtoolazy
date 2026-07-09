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
Until the Web Store release (Fase 3.H), install the developer way:

```bash
git clone https://github.com/MRLNT/iamtoolazy && cd iamtoolazy
npm install && npm run build:ext
```

Then: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select the `packages/extension` folder.

**How to use it:** type your prompt in the chat box, then press
**Alt+L** (**⌥L** on Mac). Your text compresses in place, a koala toast
shows the honest savings, and **Undo** brings the original back.
A green `on` badge on the toolbar icon means the extension found the
chat box. Automatic mode with a preview diff arrives in Fase 3.C.
Details: [packages/extension](packages/extension/README.md).

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

**Does my data go anywhere?** No. Everything runs locally; there is no
server, no telemetry, no account. The optional BYOK refine feature
(coming in 3.D) sends text only to the AI provider *you* configure with
*your* key.

**Will it change my meaning?** It refuses to touch code, URLs, paths,
numbers, and negations — enforced by tests, and structurally impossible
to remove in the compressor. When in doubt, it keeps your wording.

**How much does it save?** Honestly: it depends, and today's numbers are
labeled estimates. Typical sloppy prompts compress 30–70%. Reproducible
benchmarks (run N times, reported as mean ± spread, never single runs)
land in Fase 4.

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
