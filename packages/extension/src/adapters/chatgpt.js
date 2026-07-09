// chatgpt.com — currently a ProseMirror contenteditable; older builds used
// #prompt-textarea (kept in the ladder). The generic picker in base.js
// guards against wrapper containers (field lesson, Fase 3.B).
export default {
  site: 'chatgpt.com',
  inputSelectors: [
    '#prompt-textarea',
    'div[contenteditable="true"].ProseMirror',
    'form div[contenteditable="true"]',
    'div[contenteditable="true"]',
  ],
};
