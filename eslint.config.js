import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', URL: 'readonly', window: 'readonly', document: 'readonly', location: 'readonly', chrome: 'readonly', setTimeout: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  { ignores: ['node_modules/**', 'assets/**'] },
];
