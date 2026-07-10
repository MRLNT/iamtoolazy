# iamtoolazy — browser extension (MV3)

**Status: Fase 3.C — preview diff live.** The build pipeline, manifest, settings
storage, and popup shell are real. Site adapters (3.B ✅) and the preview
diff with Enter send-guard (3.C ✅) are live; the ledger dashboard +
wizard + BYOK (3.D), history savers (3.E), and media savers (3.F) land
next, per [docs/master-plan.md](../../docs/master-plan.md).

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
