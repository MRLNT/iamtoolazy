// iamtoolazy — background service worker (bundled from @iamtoolazy/core).
import { refineWithLLM } from '../../core/src/index.js';

chrome.runtime.onInstalled.addListener(async (details) => {
  const cur = await chrome.storage.local.get('settings');
  if (!cur.settings) {
    await chrome.storage.local.set({
      settings: {
        'claude.ai': 'preview',
        'chatgpt.com': 'preview',
        'gemini.google.com': 'preview',
      },
    });
  }
  // First-run wizard: a real install only (not reloads/updates).
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome.html') });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Per-tab badge: 'on' when the composer was found, '!' when not.
  if (msg?.type === 'lazy-status' && sender.tab?.id) {
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.inputFound ? 'on' : '!' });
    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: msg.inputFound ? '#1a7f37' : '#9e6a03',
    });
    return;
  }
  // BYOK refine: runs HERE (content scripts can't cross-origin fetch).
  // The key never leaves this machine except to the provider YOU chose.
  if (msg?.type === 'lazy-refine') {
    (async () => {
      try {
        const { byok } = await chrome.storage.local.get('byok');
        if (!byok?.apiKey || !byok?.provider) {
          return sendResponse({ ok: false, error: 'no API key configured (Options → AI refine)' });
        }
        const text = await refineWithLLM(msg.text, {
          provider: byok.provider,
          apiKey: byok.apiKey,
          lang: msg.lang || 'en',
        });
        sendResponse({ ok: true, text });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true; // async sendResponse
  }
});
