// gemini.google.com — Quill editor inside <rich-textarea>.
export default {
  site: 'gemini.google.com',
  inputSelectors: [
    'rich-textarea .ql-editor',
    'div.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
  ],
};
