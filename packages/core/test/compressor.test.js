import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mask, unmask } from '../src/protect.js';
import { compress } from '../src/compressor.js';

test('mask/unmask roundtrip is identity', () => {
  const s = 'Fix `foo()` in ./src/app.js, see https://example.com/x?a=1 and "the spec".';
  const { masked, spans } = mask(s);
  assert.equal(unmask(masked, spans), s);
  assert.ok(spans.length >= 3);
});

test('EN: strips opener, please, and closer', () => {
  const r = compress('Hi! Could you please fix this bug? Thanks in advance!');
  assert.match(r.text, /^Fix this bug\?/);
  assert.ok(!/thanks/i.test(r.text));
  assert.ok(r.savedChars > 0);
  assert.equal(r.lang, 'en');
});

test('ID: strips tolong opener and makasih closer', () => {
  const r = compress('Tolong bantu buatkan fungsi validasi email untuk saya ya. Makasih banyak!');
  assert.match(r.text, /^Buatkan fungsi validasi email/);
  assert.ok(!/makasih/i.test(r.text));
  assert.equal(r.lang, 'id');
});

test('code fences, inline code, URLs, filenames survive byte-for-byte', () => {
  const code = '```js\nconst a = "please just do it";\n```';
  const input = `Please review ${code} and \`the_var\` in utils.py plus https://a.b/c-just-d thanks!`;
  const r = compress(input, { level: 'ultra' });
  assert.ok(r.text.includes(code));
  assert.ok(r.text.includes('`the_var`'));
  assert.ok(r.text.includes('utils.py'));
  assert.ok(r.text.includes('https://a.b/c-just-d'));
});

test('nested protection: a URL inside a quoted call survives (regression: fetch(\'0\') bug)', () => {
  // The single-quote pattern wraps the already-masked URL, nesting two
  // placeholders; a single-pass unmask left the inner URL as \u00000\u0000.
  const input = "please help debug this: fetch('https://api.example.com/v2/users/1841') returns 404 but the id 1841 exists";
  const r = compress(input, { level: 'ultra' });
  assert.ok(
    r.text.includes("fetch('https://api.example.com/v2/users/1841')"),
    `URL must survive intact, got: ${r.text}`
  );
  assert.ok(!/\u0000/.test(r.text), 'no mask placeholder may leak into output');
});

test('quoted string wrapping a filename also survives nesting', () => {
  const r = compress('open "config in settings.json" and rerun', { level: 'ultra' });
  assert.ok(r.text.includes('"config in settings.json"'), r.text);
  assert.ok(!/\u0000/.test(r.text));
});

test('EN closer with stacked modifiers is stripped (regression: "thanks so much in advance")', () => {
  const r = compress('write a haiku about rain. Thanks so much in advance!', { level: 'full' });
  assert.ok(!/thanks so much in advance/i.test(r.text), `closer must be removed, got: ${r.text}`);
  assert.ok(/haiku about rain/i.test(r.text), 'task text must survive');
});

test('negations are never removed', () => {
  const r = compress("Please refactor this, but don't change the public API and jangan hapus tes.", { level: 'ultra' });
  assert.ok(/don't change/.test(r.text));
  assert.ok(/jangan hapus/.test(r.text));
});

test('levels are monotonic: ultra removes at least as much as lite', () => {
  const input = 'Could you please just quickly write a really simple summary of the report for me? Thanks!';
  const lite = compress(input, { level: 'lite' });
  const full = compress(input, { level: 'full' });
  const ultra = compress(input, { level: 'ultra' });
  assert.ok(full.text.length <= lite.text.length);
  assert.ok(ultra.text.length <= full.text.length);
});

test('never returns an empty prompt', () => {
  const r = compress('Thanks!');
  assert.ok(r.text.trim().length > 0);
});

test('removal log powers the preview diff', () => {
  const r = compress('Please kindly summarize this article. Thank you so much!');
  const types = r.removed.map((x) => x.type);
  assert.ok(types.includes('opener') || types.includes('filler'));
  assert.ok(types.includes('closer'));
});
