import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAll, validateRecord } from '../validate.mjs';

test('all committed workloads pass schema validation', () => {
  const { errors, files, records } = validateAll();
  assert.deepEqual(errors, [], `workload validation errors:\n${errors.join('\n')}`);
  assert.equal(files, 10, 'expected 10 workload files');
  assert.ok(records >= 86, `expected >= 86 records (8x10 single-turn + 2x3 history), found ${records}`);
});

// Negative cases: a validator that never fails proves nothing.
const ctx = { cls: 'coding', lang: 'en', where: 'inline' };

test('rejects wrong id pattern', () => {
  const errs = validateRecord(
    { id: 'coding-id-01', class: 'coding', lang: 'en', prompt: 'x' },
    ctx
  );
  assert.ok(errs.some((e) => e.includes('id must match')));
});

test('rejects empty prompt and unknown tags', () => {
  const errs = validateRecord(
    { id: 'coding-en-99', class: 'coding', lang: 'en', prompt: '  ', tags: ['spicy'] },
    ctx
  );
  assert.ok(errs.some((e) => e.includes('prompt must be a non-empty string')));
  assert.ok(errs.some((e) => e.includes('tags must be an array drawn from')));
});

test('rejects history record with out-of-range probe source_turn', () => {
  const turns = [];
  for (let i = 0; i < 6; i++) {
    turns.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `t${i}` });
  }
  const errs = validateRecord(
    {
      id: 'history-en-99',
      class: 'history',
      lang: 'en',
      turns,
      final_prompt: 'go',
      probes: [
        { id: 'p1', question: 'q', expected: 'a', source_turn: 0 },
        { id: 'p2', question: 'q', expected: 'a', source_turn: 6 },
      ],
    },
    { cls: 'history', lang: 'en', where: 'inline' }
  );
  assert.ok(errs.some((e) => e.includes('source_turn must be a valid index')));
});

test('rejects non-alternating turns', () => {
  const turns = [
    { role: 'user', content: 'a' },
    { role: 'user', content: 'b' },
    { role: 'assistant', content: 'c' },
    { role: 'user', content: 'd' },
    { role: 'assistant', content: 'e' },
    { role: 'user', content: 'f' },
  ];
  const errs = validateRecord(
    {
      id: 'history-en-98',
      class: 'history',
      lang: 'en',
      turns,
      final_prompt: 'go',
      probes: [
        { id: 'p1', question: 'q', expected: 'a', source_turn: 0 },
        { id: 'p2', question: 'q', expected: 'a', source_turn: 1 },
      ],
    },
    { cls: 'history', lang: 'en', where: 'inline' }
  );
  assert.ok(errs.some((e) => e.includes('alternate roles')));
});
