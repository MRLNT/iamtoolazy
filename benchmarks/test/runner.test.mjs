import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runBenchmark,
  probeVerdict,
  SINGLE_CONDITIONS,
  HISTORY_CONDITIONS,
} from '../run.mjs';

const quiet = () => {};

test('offline run covers every condition x record, deterministic, baseline delta is zero', async () => {
  const out = mkdtempSync(join(tmpdir(), 'bench-offline-'));
  const r = await runBenchmark({ mode: 'offline', outDir: out, log: quiet });

  assert.equal(r.liveCalls, 0, 'offline must make zero live calls');
  const singles = r.results.filter((x) => x.class !== 'history');
  const hist = r.results.filter((x) => x.class === 'history');
  assert.equal(singles.length, 80 * SINGLE_CONDITIONS.length);
  assert.equal(hist.length, 6 * HISTORY_CONDITIONS.length);

  for (const row of r.results.filter((x) => x.condition === 'baseline')) {
    assert.equal(row.input_delta_tokens, 0, `baseline delta must be 0 (${row.id})`);
  }
  // Every overhead-bearing condition is visible, never hidden.
  const brief = r.results.filter((x) => x.condition === 'be-brief');
  assert.ok(brief.every((x) => x.input_delta_tokens > 0), 'be-brief adds input overhead on every prompt');

  // Files on disk: one JSONL per condition + meta.json, every line parses.
  const files = readdirSync(out);
  assert.ok(files.includes('meta.json'));
  for (const cond of [...SINGLE_CONDITIONS, ...HISTORY_CONDITIONS]) {
    assert.ok(files.includes(`${cond}.jsonl`), `missing ${cond}.jsonl`);
    const lines = readFileSync(join(out, `${cond}.jsonl`), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) JSON.parse(line);
  }
});

test('ablation E2 (guard off) injects where iamtoolazy honestly skips', async () => {
  const out = mkdtempSync(join(tmpdir(), 'bench-e2-'));
  const r = await runBenchmark({
    mode: 'offline', outDir: out, conditions: ['iamtoolazy', 'E2'], log: quiet,
  });
  const lazySkips = r.results.filter((x) => x.condition === 'iamtoolazy' && x.injected === false);
  assert.ok(lazySkips.length > 0, 'workloads must contain prompts the net-positive guard skips (terse ones)');
  for (const skip of lazySkips) {
    const e2 = r.results.find((x) => x.condition === 'E2' && x.id === skip.id);
    assert.equal(e2.injected, true, `E2 must inject on ${skip.id} where the guard skipped`);
    assert.ok(e2.input_delta_tokens > skip.input_delta_tokens,
      `E2 overhead must exceed iamtoolazy on skipped ${skip.id}`);
  }
});

test('hist-delta and hist-distill reduce input tokens vs full history (distill modeled offline)', async () => {
  const out = mkdtempSync(join(tmpdir(), 'bench-hist-'));
  const r = await runBenchmark({
    mode: 'offline', outDir: out,
    conditions: [...HISTORY_CONDITIONS], log: quiet,
  });
  for (const row of r.results.filter((x) => x.condition === 'hist-full')) {
    assert.equal(row.input_delta_tokens, 0);
  }
  for (const row of r.results.filter((x) => x.condition === 'hist-distill')) {
    assert.equal(row.modeled, true, 'offline distill must be flagged modeled');
    assert.ok(row.input_delta_tokens < 0, `distill must beat full history (${row.id})`);
    assert.ok(row.one_time_distill_tokens_estimate > 0, 'one-time cost must be reported, not hidden');
  }
  for (const row of r.results.filter((x) => x.condition === 'hist-delta')) {
    assert.ok(row.input_delta_tokens <= 0, `delta must never exceed full history (${row.id})`);
  }
});

test('dry-run projects calls and cost but writes and spends nothing', async () => {
  const r = await runBenchmark({
    mode: 'dry-run', n: 5, priceInPerMTok: 1.0, log: quiet,
  });
  assert.equal(r.liveCalls, 0);
  assert.equal(r.writtenTo, null, 'dry-run must not write results');
  // 80 singles x 8 conds x 5 + history: 6 recs x 3 conds x 5 x (1 + 3 probes) + 6 distill calls
  const expected = 80 * 8 * 5 + 6 * 3 * 5 * 4 + 6;
  assert.equal(r.projection.projected_live_calls, expected);
  assert.ok(r.projection.projected_input_tokens_estimate > 0);
  assert.ok(r.projection.projected_input_cost > 0);
  assert.match(r.projection.cost_note, /lower bound/);
});

test('live mode with mock provider: n repeats, measured fields, probe verdicts recorded', async () => {
  const out = mkdtempSync(join(tmpdir(), 'bench-live-'));
  const r = await runBenchmark({
    mode: 'live', provider: 'mock', n: 2, outDir: out,
    conditions: ['iamtoolazy', 'hist-full'], filter: '-en-01', log: quiet,
  });
  // filter '-en-01' matches coding/reasoning/qa/writing/history en-01 → 4 singles + 1 history
  const singles = r.results.filter((x) => x.class !== 'history');
  const hist = r.results.filter((x) => x.class === 'history');
  assert.equal(singles.length, 4 * 2, 'n=2 repeats per single record');
  assert.equal(hist.length, 1 * 2, 'n=2 repeats per history record');
  for (const row of r.results) {
    assert.ok(Number.isFinite(row.tokens_out_measured), 'live rows carry measured output tokens');
  }
  for (const row of hist) {
    assert.equal(row.probes.length, 3, 'every probe answered every repeat');
    for (const p of row.probes) {
      assert.ok(['pass', 'fail'].includes(p.verdict));
      assert.match(p.verdict_method, /string-match/);
    }
  }
  assert.ok(existsSync(join(out, 'meta.json')));
});

test('probeVerdict: all expected fragments must appear, punctuation-insensitive', () => {
  assert.equal(probeVerdict('The budget was 1,800 total.', '1,800'), 'pass');
  assert.equal(probeVerdict('Her name is Mira and she is vegetarian.', 'Mira, vegetarian'), 'pass');
  assert.equal(probeVerdict('Her name is Mira.', 'Mira, vegetarian'), 'fail');
});
