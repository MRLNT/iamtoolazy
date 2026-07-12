// iamtoolazy — options: per-site mode, persisted to chrome.storage.local.
const SITES = ['claude.ai', 'chatgpt.com', 'gemini.google.com'];
const MODES = ['preview', 'auto', 'off'];
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

for (const k of document.querySelectorAll('.kbd-combo')) {
  k.textContent = IS_MAC ? '⌥L' : 'Alt+L';
}

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

  const pdfBox = document.getElementById('pdftext');
  pdfBox.checked = settings.pdfText === true;
  pdfBox.addEventListener('change', async () => {
    settings.pdfText = pdfBox.checked;
    await chrome.storage.local.set({ settings });
    const s = document.getElementById('saved');
    s.style.visibility = 'visible';
    setTimeout(() => (s.style.visibility = 'hidden'), 1200);
  });
})();
