import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refine, extract, classify } from '../src/refiner.js';

test('EN: extracts persona, constraints, format into structure', () => {
  const p = 'Act as a nutritionist. I am training for a marathon in October. Create a weekly meal plan. Avoid dairy and keep it under 2000 calories per day. Present it as a table.';
  const r = refine(p);
  assert.equal(r.applied, 'structure');
  assert.match(r.refined, /^You are a nutritionist\./);
  assert.match(r.refined, /Task: Create a weekly meal plan\./);
  assert.match(r.refined, /Constraints: .*Avoid dairy/);
  assert.match(r.refined, /Format: .*table/);
  assert.match(r.refined, /Context: .*marathon/);
});

test('ID: extracts batasan and format with Indonesian labels', () => {
  const p = 'Saya sedang membangun aplikasi kasir untuk warung. Buatkan skema database untuk produk dan transaksi. Jangan pakai ORM, maksimal 5 tabel. Tulis dalam format SQL.';
  const r = refine(p);
  assert.equal(r.lang, 'id');
  assert.equal(r.applied, 'structure');
  assert.match(r.refined, /Tugas: Buatkan skema database/);
  assert.match(r.refined, /Batasan: .*Jangan pakai ORM/);
  assert.match(r.refined, /Format: .*SQL/);
  assert.match(r.refined, /Konteks: .*warung/);
});

test('short prompt: auto mode leaves it alone', () => {
  const r = refine('What is HTTP/3?');
  assert.equal(r.applied, 'none');
  assert.equal(r.refined, 'What is HTTP/3?');
});

test('task without leading verb still gets promoted', () => {
  const { parts } = extract('The report is due Friday and the client hates jargon.');
  assert.ok(parts.task.length > 0);
});

test('classify: coding detected via keywords and code fences', () => {
  assert.equal(classify('Fix this bug in my API endpoint').type, 'coding');
  assert.equal(classify('Kenapa ```const x=1``` error di sini?').type, 'coding');
});

test('classify: qa short question gets low expected tokens', () => {
  const c = classify('Ibukota Australia apa?');
  assert.equal(c.type, 'qa');
  assert.ok(c.expectedTokens <= 250);
});

test('classify: brief/detail modifiers scale expectations', () => {
  const brief = classify('Briefly explain how DNS works');
  const detail = classify('Explain in depth and step-by-step how DNS works');
  assert.ok(brief.expectedTokens < detail.expectedTokens);
});
