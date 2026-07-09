// iamtoolazy — content entry (Fase 3.B: adapters + Alt+L).
import { getAdapter } from './adapters/index.js';
import { initHotkey } from './hotkey.js';

const site = location.hostname.replace(/^www\./, '');

(async () => {
  const { settings = {} } = await chrome.storage.local.get('settings');
  const mode = settings[site] || 'preview';

  const adapter = getAdapter(site);
  let inputFound = false;
  if (adapter) {
    initHotkey(adapter, adapter.site);
    inputFound = !!(await adapter.waitForInput(10000));
  }

  console.info(
    `%c🐨 iamtoolazy%c on ${site} · mode: ${mode} · adapter: ${adapter ? adapter.site : 'none'} · ` +
    `composer: ${inputFound ? 'found ✓' : 'NOT found ✗'} · press Alt+L in the composer to compress in place`,
    'font-weight:bold', ''
  );

  try {
    chrome.runtime.sendMessage({ type: 'lazy-status', site, inputFound });
  } catch { /* background may be asleep; badge is cosmetic */ }

  window.__iamtoolazy = { site, mode, adapter: adapter?.site || null, inputFound };
})();
