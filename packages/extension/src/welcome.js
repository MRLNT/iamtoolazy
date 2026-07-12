// iamtoolazy — first-run wizard: per-site mode pickers + done.
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
    const seg = document.createElement('div');
    seg.className = 'seg';
    for (const m of MODES) {
      const b = document.createElement('button');
      b.textContent = m;
      b.dataset.mode = m;
      const paint = () => b.classList.toggle('active', (settings[site] || 'preview') === m);
      paint();
      b.addEventListener('click', async () => {
        settings[site] = m;
        await chrome.storage.local.set({ settings });
        seg.querySelectorAll('button').forEach((x) =>
          x.classList.toggle('active', x.textContent === m));
      });
      seg.appendChild(b);
    }
    row.append(label, seg);
    root.appendChild(row);
  }
  const copyBtn = document.getElementById('copySample');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById('sample').value);
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
    } catch {
      document.getElementById('sample').select();
      copyBtn.textContent = 'Press ⌘C';
    }
  });

  document.getElementById('done').addEventListener('click', async () => {
    await chrome.storage.local.set({ wizardDone: true });
    window.close();
  });
})();
