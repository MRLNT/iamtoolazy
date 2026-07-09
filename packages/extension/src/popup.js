// iamtoolazy — popup: one-click mode toggle for the CURRENT site
// (activeTab grants the URL only when the user opens this popup),
// plus the other sites' modes at a glance.
const SITES = ['claude.ai', 'chatgpt.com', 'gemini.google.com'];

(async () => {
  document.getElementById('version').textContent =
    `v${chrome.runtime.getManifest().version} — extension beta`;

  const { settings = {} } = await chrome.storage.local.get('settings');

  // Which site is the active tab on?
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
        paint(); renderOthers();
      });
    }
    paint();
  }

  function renderOthers() {
    const rows = SITES.filter((s) => s !== here)
      .map((s) => `${s}: <b>${settings[s] || 'preview'}</b>`)
      .join('<br>');
    document.getElementById('modes').innerHTML =
      rows ? `<span class="dim">other sites</span><br>${rows}` : '';
  }
  renderOthers();
})();
