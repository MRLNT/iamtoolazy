// claude.ai — ProseMirror contenteditable composer.
export default {
  site: 'claude.ai',
  inputSelectors: [
    'div[contenteditable="true"].ProseMirror',
    'div[aria-label*="prompt" i][contenteditable="true"]',
    'div[contenteditable="true"]',
  ],
};
