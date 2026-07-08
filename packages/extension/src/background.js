// iamtoolazy — background service worker (MV3).
// Scaffold scope: seed default settings on install. The wizard (3.D)
// will take over first-run UX later.
chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.local.get('settings');
  if (cur.settings) return; // never overwrite user choices
  await chrome.storage.local.set({
    settings: {
      // preview = show the diff and ask, per site. auto/off arrive in 3.C.
      'claude.ai': 'preview',
      'chatgpt.com': 'preview',
      'gemini.google.com': 'preview',
    },
  });
});
