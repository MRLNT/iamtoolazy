// iamtoolazy — Alt+L: compress the composer text in place.
// The first real user feature: works TODAY without send-interception
// (that arrives with the preview diff in Fase 3.C), and stays as the
// manual fallback forever — selectors may rot, Alt+L survives.

import { compress, estimateTokens } from '../../core/src/index.js';

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

async function run(adapter, site) {
  const { settings = {} } = await chrome.storage.local.get('settings');
  if ((settings[site] || 'preview') === 'off') {
    return toast('off on this site — change it in Options.');
  }
  const el = adapter.findInput();
  if (!el) return toast('composer not found — report this, selectors may have rotted.');
  const before = adapter.getText(el);
  if (!before.trim()) return toast('nothing to compress.');

  // Root cause of the three-round "undefined" saga: compress() returns
  // `.text` — `.output` belongs to processPrompt(). Guarded forever:
  const { text: output } = compress(before, { level: 'full' });
  if (typeof output !== 'string' || !output.trim()) {
    return toast('internal error: compressor returned nothing — please report this.');
  }
  const b = estimateTokens(before);
  const a = estimateTokens(output);
  if (a >= b || output === before) return toast('already lean.');

  const wrote = await adapter.setText(el, output);
  if (!wrote.ok) {
    // The site editor rejected our write. Keep the original, SHOW the
    // compressed text, and let the user copy it with an explicit button
    // (user-initiated = clipboard access the honest way). Never silent.
    const restored = await adapter.setText(el, before);
    console.info('🐨 iamtoolazy compressed text (rescue):', output);
    const preview = output.length > 100 ? output.slice(0, 100) + '…' : output;
    return toast(
      (restored.ok
        ? 'editor rejected the in-place edit — original kept. compressed: '
        : 'edit failed — check your text. compressed: ') + `“${preview}”`,
      [{
        label: 'Copy',
        onClick: async () => {
          const ok = await copyToClipboard(output);
          toast(ok ? 'copied 📋 — paste it into the chat box.' : 'copy failed — grab it from the DevTools console.');
        },
      }]
    );
  }
  const pct = Math.round((1 - a / b) * 100);
  toast(`saved −${pct}% (~${b} → ~${a} tok, estimates)`, [{
    label: 'Undo',
    onClick: async () => { await adapter.setText(el, before); toast('restored.'); },
  }]);
  appendLedger({ ts: Date.now(), site, kind: 'hotkey', beforeTok: b, afterTok: a });
}

export function initHotkey(adapter, site) {
  document.addEventListener('keydown', (e) => {
    if (!e.altKey || e.code !== 'KeyL' || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    run(adapter, site);
  }, true);
}
