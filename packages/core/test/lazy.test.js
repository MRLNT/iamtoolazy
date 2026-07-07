import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deltaCompress } from '../src/delta.js';
import { createCalibration, observe, getParams } from '../src/calibrator.js';
import { decideInjection } from '../src/injector.js';
import { processPrompt } from '../src/pipeline.js';

const HISTORY =
  'User: I am building a small internal invoicing app in Node for my team. ' +
  'Assistant: Understood — a small internal invoicing app in Node.';

test('delta: drops context the conversation already established', () => {
  const r = deltaCompress(
    'I am building a small internal invoicing app in Node. Add CSV export for invoices.',
    HISTORY,
  );
  assert.equal(r.dropped.length, 1);
  assert.match(r.dropped[0].text, /invoicing app/);
  assert.match(r.text, /^Add CSV export/);
  assert.ok(r.savedChars > 0);
});

test('delta: task sentences, negations, unseen numbers, code are never dropped', () => {
  const r = deltaCompress(
    'Add CSV export. Do not touch the invoicing app auth. The app must handle 5000 invoices. See `exportCsv()`.',
    HISTORY,
  );
  assert.equal(r.dropped.length, 0);
});

test('delta: no history means no-op', () => {
  const r = deltaCompress('I am building an invoicing app.', '');
  assert.equal(r.text, 'I am building an invoicing app.');
  assert.equal(r.dropped.length, 0);
});

test('calibrator: cold start returns nulls (static defaults apply)', () => {
  const p = getParams(createCalibration(), 'coding');
  assert.equal(p.expectedTokens, null);
  assert.equal(p.savingsFactor, null);
});

test('calibrator: learns expected tokens and clamped savings factor', () => {
  const state = createCalibration();
  for (const v of [800, 900, 1000]) observe(state, { classType: 'coding', injected: false, actualTokens: v });
  for (const v of [400, 450, 500]) observe(state, { classType: 'coding', injected: true, actualTokens: v });
  const p = getParams(state, 'coding');
  assert.ok(p.expectedTokens > 700 && p.expectedTokens < 1000);
  assert.ok(p.savingsFactor >= 0.15 && p.savingsFactor <= 0.6);
  assert.equal(getParams(state, 'qa').expectedTokens, null); // other classes untouched
});

test('calibrator: state survives JSON round-trip', () => {
  const state = createCalibration();
  observe(state, { classType: 'qa', injected: false, actualTokens: 120 });
  const revived = JSON.parse(JSON.stringify(state));
  observe(revived, { classType: 'qa', injected: false, actualTokens: 130 });
  assert.equal(revived.classes.qa.plain.n, 2);
});

test('injector: calibration can flip a static-no into a measured-yes', () => {
  const prompt = 'Summarize the meeting notes'; // 'other' class, static expected 350
  const state = createCalibration();
  // This user's real responses for this class run long:
  for (const v of [900, 950, 1000]) observe(state, { classType: 'other', injected: false, actualTokens: v });
  const cold = decideInjection(prompt, { minExpectedTokens: 600 });
  const warm = decideInjection(prompt, { minExpectedTokens: 600, calibration: state });
  assert.equal(cold.inject, false);
  assert.equal(warm.inject, true);
  assert.equal(warm.calibrated, true);
});

test('pipeline: history triggers the delta stage in the ledger', () => {
  const r = processPrompt(
    'I am building a small internal invoicing app in Node. Please add CSV export with tests.',
    { history: HISTORY },
  );
  assert.ok(r.stages.some((s) => s.stage === 'delta'));
  assert.ok(r.delta.dropped.length >= 1);
  assert.match(r.output, /CSV export/);
});
