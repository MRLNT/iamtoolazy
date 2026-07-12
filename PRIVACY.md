# Privacy — what iamtoolazy stores, where, and what never leaves your machine

**The one-line version: everything runs in your browser, nothing is sent
anywhere, and there is no "anywhere" to send it to — the extension makes
zero network calls, has no server, no accounts, and no telemetry.**

This document is specific on purpose. Vague privacy policies are a smell;
you should be able to verify every claim here against the source in this
repository.

## What the extension can see

The extension's content script runs **only** on three pages, declared in
`packages/extension/manifest.json`:

- `https://claude.ai/*`
- `https://chatgpt.com/*`
- `https://gemini.google.com/*`

On those pages it can read the chat composer (to compress your prompt)
and file-input events (to offer image downscaling and PDF text
extraction). It does not run anywhere else, and it cannot see other
tabs, your history, or your bookmarks.

**Prompt data is sensitive by definition** — that assumption drives the
whole design. Your prompts are processed in-page, synchronously, by code
bundled inside the extension. They are never transmitted, logged, or
persisted (see the table below for the few things that *are* stored).

## Exactly what is stored, and where

Everything lives in `chrome.storage.local` — your browser's local
extension storage on your machine. Complete inventory:

| Key | Contents | Contains your prompt text? |
|---|---|---|
| `settings` | per-site mode (`preview`/`auto`/`off`) and the PDF→text toggle | no |
| `ledger` | savings entries: timestamp, site, kind, before/after **token counts** (capped at the last 200 entries) | **no — numbers only, never text** |
| `wizardDone` | boolean: first-run wizard completed | no |
| `pdfHintShown` | boolean: one-time PDF tip already shown | no |

That is the whole list. To verify: `grep -rn "storage.local" packages/extension/src/`.

**Session memory** (the delta-context feature that spots repeated
sentences across turns) is held **in the page's memory only**, per tab.
It is never written to storage. Close or refresh the tab and it's gone.

## Media features

- **Image downscale** decodes and resizes images with an in-page canvas.
  Pixels never leave the tab; the site receives either your original file
  or the resized one — your choice, every time.
- **PDF → text** is double-gated (an Options toggle that is **off by
  default**, plus a per-file confirm) and runs a bundled pdf.js entirely
  inside the tab. The PDF file never uploads when you choose Extract.
  The extracted text is placed in the composer **for your review —
  nothing is auto-sent**. Do read it before sending: PDFs often contain
  more than you remember (names, account numbers, letterheads), and once
  you press send, it's a message like any other.

## What does NOT exist in this codebase

- no `fetch`/`XMLHttpRequest`/`WebSocket` to any server (verify:
  `grep -rn "fetch(" packages/extension/src/` — the only network-capable
  API in the extension was removed along with the BYOK feature, and
  `host_permissions` was deleted from the manifest in the same commit)
- no analytics, telemetry, crash reporting, or "anonymous usage stats"
- no accounts, no cookies, no fingerprinting
- no remote code: everything executes from the signed extension package

## Your controls

- Per-site **off** mode disables the shortcut entirely on that site.
- The popup's **reset** wipes the ledger.
- Uninstalling the extension deletes `chrome.storage.local` with it.

## Honest limits of this document

This policy covers the extension only. The chat sites themselves
(claude.ai, chatgpt.com, gemini.google.com) receive whatever you
actually send them and have their own privacy policies. A prompt we
compressed is still a prompt you sent.
