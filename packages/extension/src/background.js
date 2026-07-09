// iamtoolazy — background service worker (MV3).
chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.local.get('settings');
  if (cur.settings) return; // never overwrite user choices
  await chrome.storage.local.set({
    settings: {
      'claude.ai': 'preview',
      'chatgpt.com': 'preview',
      'gemini.google.com': 'preview',
    },
  });
});

// Per-tab badge: 'on' when the composer was found, '!' when not.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'lazy-status' || !sender.tab?.id) return;
  chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.inputFound ? 'on' : '!' });
  chrome.action.setBadgeBackgroundColor({
    tabId: sender.tab.id,
    color: msg.inputFound ? '#1a7f37' : '#9e6a03',
  });
});
