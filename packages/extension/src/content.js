// iamtoolazy — content entry (Fase 3.B: adapters + Alt+L).
import { compress, estimateTokens, DISTILL_PROMPT } from '../../core/src/index.js';
import { getAdapter } from './adapters/index.js';
import { initHotkey } from './hotkey.js';
import { initMediaSavers } from './media.js';

const site = location.hostname.replace(/^www\./, '');

(async () => {
  let settings;
  try { ({ settings = {} } = await chrome.storage.local.get('settings')); }
  catch { console.info('🐨 iamtoolazy: extension was reloaded — refresh this tab to reconnect.'); return; }
  const mode = settings[site] || 'preview';

  const adapter = getAdapter(site);
  let inputFound = false;
  if (adapter) {
    initHotkey(adapter, adapter.site);
    inputFound = !!(await adapter.waitForInput(10000));
    // Fase 3.F: media savers ride along unless the site is switched off.
    if (mode !== 'off') initMediaSavers(adapter.site);
  }

  // Truth-serum self-test: print the REAL compressed string, so a broken
  // pipeline is impossible to misread as success ever again.
  const st = compress('Hi! Could you please maybe fix this bug? Thanks so much!!', { level: 'full' });
  console.info(
    `%c🐨 iamtoolazy%c on ${site} · mode: ${mode} · adapter: ${adapter ? adapter.site : 'none'} · ` +
    `composer: ${inputFound ? 'found ✓' : 'NOT found ✗'} · self-test: "${st.text}" ` +
    `(~${estimateTokens(st.text)} tok) · press Alt+L in the composer to compress in place`,
    'font-weight:bold', ''
  );

  try {
    chrome.runtime.sendMessage({ type: 'lazy-status', site, inputFound });
  } catch { /* background may be asleep; badge is cosmetic */ }

  window.__iamtoolazy = { site, mode, adapter: adapter?.site || null, inputFound };

  // 🧵 Distill this thread (Fase 3.E): the popup asks us to place the
  // distill request in the composer. The AI already sees its own thread —
  // no scraping needed. You review, you send, you paste the brief into a
  // fresh chat. Zero network, zero magic.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== 'lazy-distill' || !adapter) return;
    (async () => {
      const el = adapter.findInput() || (await adapter.waitForInput(3000));
      if (!el) return;
      const lang = /^id\b/i.test(navigator.language) ? 'id' : 'en';
      await adapter.setText(el, DISTILL_PROMPT[lang](400));
    })();
  });
})();
