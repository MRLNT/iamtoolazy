// iamtoolazy — Alt+L: compress the composer text.
// Modes (per site, set in the popup/options):
//   preview (default) → open the diff overlay; only Apply writes
//   auto              → apply instantly, Undo in the toast
//   off               → do nothing, say so
// Field-hardened: verified writes, honest failure toast with an explicit
// Copy button, ledger entry only on verified success.

import { compress, estimateTokens } from '../../core/src/index.js';
import { showPreview } from './ui/diff.js';

let host, root, hideTimer;

function toast(msg, buttons = []) {
  if (!host) {
    host = document.createElement('div');
    host.style.cssText =
      'position:fixed;bottom:16px;right:16px;z-index:2147483647;';
    root = host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(host);
  }
  clearTimeout(hideTimer);
  root.innerHTML = `
    <style>
      .pill { background:#0d1117; color:#c9d1d9; border:1px solid #30363d;
              border-radius:10px; padding:10px 14px; display:flex; gap:10px;
              align-items:center; font:12px/1.4 ui-monospace,Menlo,monospace;
              box-shadow:0 4px 16px rgba(0,0,0,.5); max-width:420px;
              white-space:normal; overflow-wrap:anywhere; }
      button { background:#21262d; color:#58a6ff; border:1px solid #30363d;
               border-radius:6px; padding:2px 10px; font:inherit; cursor:pointer; }
    </style>
    <div class="pill"><span>🐨 ${msg}</span></div>`;
  for (const { label, onClick } of buttons) {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', onClick);
    root.querySelector('.pill').appendChild(b);
  }
  hideTimer = setTimeout(() => { root.innerHTML = ''; }, 10000);
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* try legacy */ }
  try {
    const t = document.createElement('textarea');
    t.value = text;
    t.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  } catch { return false; }
}

async function appendLedger(entry) {
  try {
    const { ledger = [] } = await chrome.storage.local.get('ledger');
    ledger.push(entry);
    await chrome.storage.local.set({ ledger: ledger.slice(-200) });
  } catch { /* ledger is best-effort */ }
}

/** Write finalText into the composer with the full honest-failure UX.
 *  Shared by auto mode and the preview overlay's Apply. */
async function applyWrite(adapter, el, before, finalText, site, kind) {
  const wrote = await adapter.setText(el, finalText);
  if (!wrote.ok) {
    const restored = await adapter.setText(el, before);
    console.info('🐨 iamtoolazy compressed text (rescue):', finalText);
    const preview = finalText.length > 100 ? finalText.slice(0, 100) + '…' : finalText;
    return toast(
      (restored.ok
        ? 'editor rejected the in-place edit — original kept. compressed: '
        : 'edit failed — check your text. compressed: ') + `“${preview}”`,
      [{
        label: 'Copy',
        onClick: async () => {
          const ok = await copyToClipboard(finalText);
          toast(ok ? 'copied 📋 — paste it into the chat box.' : 'copy failed — grab it from the DevTools console.');
        },
      }]
    );
  }
  const b = estimateTokens(before);
  const a = estimateTokens(finalText);
  const pct = Math.max(0, Math.round((1 - a / b) * 100));
  toast(`saved −${pct}% (~${b} → ~${a} tok, estimates)`, [{
    label: 'Undo',
    onClick: async () => { await adapter.setText(el, before); toast('restored.'); },
  }]);
  appendLedger({ ts: Date.now(), site, kind, beforeTok: b, afterTok: a });
}

async function run(adapter, site) {
  const { settings = {} } = await chrome.storage.local.get('settings');
  const mode = settings[site] || 'preview';
  if (mode === 'off') {
    return toast('off on this site — change it in Options.');
  }
  const el = adapter.findInput();
  if (!el) return toast('composer not found — report this, selectors may have rotted.');
  const before = adapter.getText(el);
  if (!before.trim()) return toast('nothing to compress.');

  // Root cause of the three-round "undefined" saga: compress() returns
  // `.text` — `.output` belongs to processPrompt(). Guarded forever:
  const { text: output, removed } = compress(before, { level: 'full' });
  if (typeof output !== 'string' || !output.trim()) {
    return toast('internal error: compressor returned nothing — please report this.');
  }
  const b = estimateTokens(before);
  const a = estimateTokens(output);
  if (a >= b || output === before) return toast('already lean.');

  if (mode === 'preview') {
    // Fase 3.C: preview finally earns its name — show the diff, let the
    // user edit, and only Apply writes anything.
    return showPreview({
      before, after: output, removed, bTok: b, aTok: a,
      onApply: (finalText) => applyWrite(adapter, el, before, finalText, site, 'preview'),
      onCopy: (t) => copyToClipboard(t),
    });
  }

  // auto mode: apply instantly, Undo in the toast
  await applyWrite(adapter, el, before, output, site, 'auto');
}

export function initHotkey(adapter, site) {
  document.addEventListener('keydown', (e) => {
    if (!e.altKey || e.code !== 'KeyL' || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    run(adapter, site);
  }, true);
}
