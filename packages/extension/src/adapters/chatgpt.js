// chatgpt.com — #prompt-textarea (contenteditable in current builds,
// classic textarea in older ones; the ladder covers both).
export default {
  site: 'chatgpt.com',
  inputSelectors: [
    '#prompt-textarea',
    'div#prompt-textarea[contenteditable="true"]',
    'textarea[data-testid="prompt-textarea"]',
    'form div[contenteditable="true"]',
  ],
};
