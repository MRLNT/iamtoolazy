import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, initTokenizer, estimatorMode, imageTokens, resizeSavings } from '../src/estimator.js';
import { decideInjection, attach } from '../src/injector.js';
import { processPrompt } from '../src/pipeline.js';

test('estimator works before init (heuristic) and after (tokenizer)', async () => {
  assert.ok(estimateTokens('hello world, this is a test') > 0);
  const loaded = await initTokenizer();
  assert.equal(loaded, true); // dep is installed in this repo
  assert.equal(estimatorMode(), 'tokenizer');
  const n = estimateTokens('hello world, this is a test');
  assert.ok(n >= 4 && n <= 12);
});

test('claude estimate applies calibration factor', () => {
  const g = estimateTokens('some reasonably long sentence to count tokens on');
  const c = estimateTokens('some reasonably long sentence to count tokens on', { provider: 'claude' });
  assert.ok(c >= g);
});

test('image tokens: claude formula and cap', () => {
  assert.equal(imageTokens(1500, 1500), 1600); // capped
  const small = imageTokens(300, 300);
  assert.equal(small, Math.ceil((300 * 300) / 750));
});

test('resize savings are real and positive for big images', () => {
  const r = resizeSavings(4032, 3024, 1092);
  assert.ok(r.saved > 0);
  assert.ok(r.after < r.before);
});

test('injector: short question → no injection (anti net-negative)', () => {
  const d = decideInjection('What time zone is Bali?');
  assert.equal(d.inject, false);
  assert.match(d.reason, /floor|savings/);
});

test('injector: long coding prompt → terse + YAGNI injected', () => {
  const d = decideInjection('Implement a REST API endpoint with detailed error handling, refactor the database schema, and explain the design step-by-step.');
  assert.equal(d.inject, true);
  assert.match(d.directive, /ultra-terse/i);
  assert.match(d.directive, /simplest working solution/i);
  assert.ok(d.expectedSavings > d.overheadTokens);
});

test('injector: yagni stays out of non-coding prompts', () => {
  const d = decideInjection('Write a detailed, comprehensive essay about the history of tea ceremonies in Japan.');
  assert.equal(d.inject, true);
  assert.ok(!/simplest working solution/i.test(d.directive));
});

test('attach appends directive after the prompt', () => {
  assert.equal(attach('do x', 'be terse'), 'do x\n\n[be terse]');
  assert.equal(attach('do x', ''), 'do x');
});

test('pipeline: full run produces honest ledger', () => {
  const r = processPrompt(
    'Hi! Could you please implement a login function with rate limiting in Node? I am building a small app. Avoid external auth providers. Show the code with comments. Thanks!',
  );
  assert.ok(r.output.length > 0);
  assert.ok(r.stages.length >= 2);
  assert.ok(typeof r.tokens.predictedNet === 'number');
  assert.ok(r.tokens.estimateNote.includes('estimates'));
});

test('pipeline: trivial prompt passes through nearly untouched', () => {
  const r = processPrompt('What is HTTP/3?');
  assert.equal(r.injection.inject, false);
  assert.match(r.output, /HTTP\/3/);
});
