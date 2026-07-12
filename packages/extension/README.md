# iamtoolazy — browser extension (MV3)

**Status: Fase 3.F — media savers live.** Adapters (3.B ✅), preview diff
(3.C ✅), popup ledger + wizard (3.D ✅), delta-context session memory +
Distill (3.E ✅), and media savers (3.F ✅) are live. Privacy docs (3.G)
and the v0.5.0 beta (3.H) land next, per
[docs/master-plan.md](../../docs/master-plan.md).

**Modes** (per site, from the popup): `preview` intercepts your Enter,
shows exactly what would be removed, and — after you approve — **you**
press Enter again to send (this extension never synthesizes a send).
`auto` applies Alt+L instantly. `off` does nothing.

## Dev install (load unpacked)

```bash
# from the repo root
npm install
npm run build:ext        # bundles @iamtoolazy/core into dist/content.js
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select the `packages/extension` folder.

Verify it's alive: open https://claude.ai, https://chatgpt.com, or
https://gemini.google.com and check DevTools console for the
`🐨 iamtoolazy attached …` line (it runs a real compress/estimate
self-test). The toolbar popup shows the per-site mode; the options page
lets you change it (preview / auto / off — the modes take real effect in
Fase 3.C).

## Media savers (Fase 3.F)

**Image downscale, confirm-first.** Models cap useful visual detail —
above ~1092 px on the long side, Claude sees no extra detail; the pixels
only bill vision tokens. When you attach an oversized image, the site's
upload is held and a pill shows the estimated saving (e.g. a 4K
screenshot: ~1600 → ~950 tok). **Downscale** resizes on a local canvas
and hands the smaller file to the site; **Keep original** (or Esc)
passes everything through untouched. On chatgpt.com no offer appears at
all: OpenAI rescales images server-side, so a client resize saves ~zero
tokens there — we don't sell savings that don't exist.

**PDF → text, double consent (off by default).** As an uploaded file a
PDF bills roughly ~1,500+ tokens *per page* (estimates, low end of the
documented range). With the Options toggle on, attaching a PDF offers to
extract its text layer locally instead — the file itself never uploads.
The pdf.js module (~1.4 MB) ships inside the extension and loads only
when you click **Extract text**; scanned PDFs with no text layer are
reported honestly and uploaded unchanged. Extracted text lands in the
composer for review — nothing is sent until you send it.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Per-site mode + the local ledger. |
| `activeTab` | Read the current tab's hostname **only when you open the popup**, so it can show a one-click mode toggle for that site. No background tab access, ever. |
| `clipboardWrite` | Used ONLY in the Alt+L rescue path: if a site's editor rejects the in-place edit, your text is copied to the clipboard instead of being lost. Never reads the clipboard. |

No host permissions beyond the three declared chat sites, no network
permissions, no telemetry. Token counts inside the extension use the
honest chars/4 heuristic (the tokenizer stays out of the bundle for now —
counts are labeled estimates everywhere).
