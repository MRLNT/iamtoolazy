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

## Install in 2 minutes (beta — load unpacked)

> Until the Chrome Web Store listing lands (Fase 3.H), installing takes
> four clicks more than the store would. Here they are, all of them:

```bash
# 1. get the code (from the repo root)
npm install
npm run build:ext
```

2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top-right corner).
4. Click **Load unpacked** → select the `packages/extension` folder.
5. A welcome tab opens with a 30-second hands-on tour — do the "Try it
   right now" step and you know the whole workflow.

**Is it working?** Open https://claude.ai — the toolbar badge shows
`on`, and the DevTools console prints a `🐨 iamtoolazy` line with a real
self-test.

## How to use — the whole thing in four lines

- **Trim a prompt:** press `Alt+L` (`⌥L` on Mac) in the chat box → a
  preview shows exactly what gets removed → **Apply**. Short prompts get
  an honest "already lean" and nothing changes.
- **Big image:** just attach it — a pill offers to downscale before
  upload, with the token math shown. One click either way.
- **PDF → text:** off by default; enable in Options. Attaching a PDF
  then offers local text extraction — the file never uploads.
- **Long thread:** popup → 🧵 **Distill this thread** → send → paste the
  brief into a fresh chat.

## Limits (ours, stated honestly)

Local processing has caps so this tab never hangs; oversized files
always **pass through untouched** — we never block an upload:

| What | Cap | Beyond the cap |
|---|---|---|
| Image local decode | 40 MB per file | passes through silently |
| PDF local extraction | 25 MB · 300 pages | honest pill, uploads unchanged |

The chat sites enforce their **own** upload limits (size, count, type)
on top of these; those are theirs and change without notice. Token
numbers for Gemini use its documented 768-px tile math; Claude uses the
~(w×h)/750 estimate; on chatgpt.com no downscale is offered because
OpenAI rescales server-side (a client resize saves ~zero).

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
