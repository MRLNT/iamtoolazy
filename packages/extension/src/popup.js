// iamtoolazy — popup (scaffold): show version + per-site modes read-only.
(async () => {
  const v = chrome.runtime.getManifest().version;
  document.getElementById('version').textContent = `v${v} — extension scaffold`;
  const { settings = {} } = await chrome.storage.local.get('settings');
  const rows = Object.entries(settings)
    .map(([site, mode]) => `${site}: <b>${mode}</b>`)
    .join('<br>');
  document.getElementById('modes').innerHTML = rows || 'no settings yet — visit a chat site once';
})();
