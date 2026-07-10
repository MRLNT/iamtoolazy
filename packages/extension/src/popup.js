// iamtoolazy — popup: quick mode toggle for the current site + the
// honest ledger (Fase 3.D). All numbers labeled estimates.
const SITES = ['claude.ai', 'chatgpt.com', 'gemini.google.com'];
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const COMBO = IS_MAC ? '⌥L (Alt+L)' : 'Alt+L';
document.getElementById('hint').innerHTML =
  `Press <b>${COMBO}</b> in the chat box · <b>preview</b> shows the diff first.`;
for (const k of document.querySelectorAll('.kbd-combo')) k.textContent = IS_MAC ? '⌥L' : 'Alt+L';

(async () => {
  document.getElementById('version').textContent =
    `v${chrome.runtime.getManifest().version} — extension beta`;

  const store = await chrome.storage.local.get(['settings', 'ledger']);
  const settings = store.settings || {};

  // ── current-site quick toggle (activeTab) ──
  let here = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const h = new URL(tab.url).hostname.replace(/^www\./, '');
    here = SITES.find((s) => h === s || h.endsWith('.' + s)) || null;
  } catch { /* not a normal tab */ }

  if (here) {
    const box = document.getElementById('here');
    box.style.display = 'block';
    box.querySelector('.site').textContent = here;
    const buttons = [...box.querySelectorAll('button')];
    const paint = () => {
      const cur = settings[here] || 'preview';
      for (const b of buttons) b.classList.toggle('active', b.dataset.mode === cur);
    };
    for (const b of buttons) {
      b.addEventListener('click', async () => {
        settings[here] = b.dataset.mode;
        await chrome.storage.local.set({ settings });
        paint();
      });
    }
    paint();

    document.getElementById('distill').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      try { await chrome.tabs.sendMessage(tab.id, { type: 'lazy-distill' }); } catch { /* tab not ready */ }
      window.close();
    });
  }

  // ── the honest ledger ──
  const renderLedger = (ledger) => {
    const entries = (ledger || []).filter((e) => e && e.beforeTok >= e.afterTok);
    if (!entries.length) return;
    const saved = entries.reduce((a, e) => a + (e.beforeTok - e.afterTok), 0);
    document.getElementById('totals').innerHTML =
      `<span class="big">~${saved} tok saved</span> · ${entries.length} compression${entries.length > 1 ? 's' : ''}`;
    const per = {};
    for (const e of entries) {
      per[e.site] = per[e.site] || { n: 0, s: 0 };
      per[e.site].n += 1;
      per[e.site].s += e.beforeTok - e.afterTok;
    }
    document.getElementById('persite').innerHTML = Object.entries(per)
      .map(([s, v]) => `${s}: ~${v.s} tok · ${v.n}×`)
      .join('<br>');
  };
  renderLedger(store.ledger);

  document.getElementById('reset').addEventListener('click', async () => {
    await chrome.storage.local.set({ ledger: [] });
    document.getElementById('totals').innerHTML =
      `ledger reset — press <b>${IS_MAC ? '⌥L' : 'Alt+L'}</b> in a chat box`;
    document.getElementById('persite').innerHTML = '';
  });

  document.getElementById('opt').addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('guide').addEventListener('click', () =>
    chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome.html') }));
})();
