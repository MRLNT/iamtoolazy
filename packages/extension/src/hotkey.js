// iamtoolazy — Alt+L: compress the composer text in place.
// The first real user feature: works TODAY without send-interception
// (that arrives with the preview diff in Fase 3.C), and stays as the
// manual fallback forever — selectors may rot, Alt+L survives.

import { compress, estimateTokens } from '../../core/src/index.js';

let host, root, hideTimer;

function toast(msg, undoCb) {
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
              box-shadow:0 4px 16px rgba(0,0,0,.5); }
      button { background:#21262d; color:#58a6ff; border:1px solid #30363d;
               border-radius:6px; padding:2px 10px; font:inherit; cursor:pointer; }
    </style>
    <div class="pill"><span>🐨 ${msg}</span></div>`;
  if (undoCb) {
    const b = document.createElement('button');
    b.textContent = 'Undo';
    b.addEventListener('click', () => { undoCb(); toast('restored.'); });
    root.querySelector('.pill').appendChild(b);
  }
  hideTimer = setTimeout(() => { root.innerHTML = ''; }, 10000);
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

  const { output } = compress(before, { level: 'full' });
  const b = estimateTokens(before);
  const a = estimateTokens(output);
  if (a >= b || output === before) return toast('already lean.');

  const wrote = adapter.setText(el, output);
  if (!wrote.ok) {
    // The site editor rejected our write. Restore the original, hand the
    // compressed text over via clipboard, and say so — never fail silently.
    const restored = adapter.setText(el, before);
    let clip = false;
    try { await navigator.clipboard.writeText(restored.ok ? output : before); clip = true; } catch { /* no clipboard */ }
    return toast(
      restored.ok
        ? `this editor rejected the in-place edit — compressed text ${clip ? 'copied to clipboard 📋, paste it manually' : 'could not be applied'}. original kept.`
        : `edit failed — your ORIGINAL text ${clip ? 'is copied to clipboard 📋' : 'may need retyping'}. please report this.`
    );
  }
  const pct = Math.round((1 - a / b) * 100);
  toast(`saved −${pct}% (~${b} → ~${a} tok, estimates)`, () => adapter.setText(el, before));
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
