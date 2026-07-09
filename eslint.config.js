import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', URL: 'readonly', window: 'readonly', document: 'readonly', location: 'readonly', chrome: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', Event: 'readonly', InputEvent: 'readonly', ClipboardEvent: 'readonly', DataTransfer: 'readonly', navigator: 'readonly', getComputedStyle: 'readonly', URL: 'readonly', requestAnimationFrame: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  { ignores: ['node_modules/**', 'assets/**'] },
];
