// iamtoolazy — background service worker (MV3).
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

// Per-tab badge: 'on' when the composer was found, '!' when not.
// Plus the options bridge: content scripts can't open the options page.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'lazy-open-options') { chrome.runtime.openOptionsPage(); return; }
  if (msg?.type !== 'lazy-status' || !sender.tab?.id) return;
  chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.inputFound ? 'on' : '!' });
  chrome.action.setBadgeBackgroundColor({
    tabId: sender.tab.id,
    color: msg.inputFound ? '#1a7f37' : '#9e6a03',
  });
});
