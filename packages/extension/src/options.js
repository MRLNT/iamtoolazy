// iamtoolazy — options: per-site mode, persisted to chrome.storage.local.
const SITES = ['claude.ai', 'chatgpt.com', 'gemini.google.com'];
const MODES = ['preview', 'auto', 'off'];

(async () => {
  const { settings = {} } = await chrome.storage.local.get('settings');
  const root = document.getElementById('sites');
  for (const site of SITES) {
    const row = document.createElement('div');
    row.className = 'site';
    const label = document.createElement('span');
    label.textContent = site;
    const sel = document.createElement('select');
    for (const m of MODES) {
      const o = document.createElement('option');
      o.value = m; o.textContent = m;
      if ((settings[site] || 'preview') === m) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', async () => {
      settings[site] = sel.value;
      await chrome.storage.local.set({ settings });
      const s = document.getElementById('saved');
      s.style.visibility = 'visible';
      setTimeout(() => (s.style.visibility = 'hidden'), 1200);
    });
    row.append(label, sel);
    root.appendChild(row);
  }
})();

// ── BYOK (Fase 3.D) ──
(async () => {
  const { byok } = await chrome.storage.local.get('byok');
  if (byok) {
    document.getElementById('provider').value = byok.provider || '';
    document.getElementById('apikey').value = byok.apiKey || '';
  }
  const flash = () => {
    const k = document.getElementById('keysaved');
    k.style.visibility = 'visible';
    setTimeout(() => (k.style.visibility = 'hidden'), 1200);
  };
  document.getElementById('savekey').addEventListener('click', async () => {
    const provider = document.getElementById('provider').value;
    const apiKey = document.getElementById('apikey').value.trim();
    await chrome.storage.local.set({ byok: provider && apiKey ? { provider, apiKey } : null });
    flash();
  });
  document.getElementById('clearkey').addEventListener('click', async () => {
    await chrome.storage.local.set({ byok: null });
    document.getElementById('provider').value = '';
    document.getElementById('apikey').value = '';
    flash();
  });
})();
