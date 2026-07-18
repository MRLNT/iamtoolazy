import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runBenchmark,
  probeVerdict,
  loadWorkloads,
  SINGLE_CONDITIONS,
  HISTORY_CONDITIONS,
} from '../run.mjs';
import { WORKLOADS_DIR } from '../validate.mjs';

const quiet = () => {};

test('offline run covers every condition x record, deterministic, baseline delta is zero', async () => {
  const out = mkdtempSync(join(tmpdir(), 'bench-offline-'));
  const r = await runBenchmark({ mode: 'offline', outDir: out, log: quiet });

  assert.equal(r.liveCalls, 0, 'offline must make zero live calls');
  const singles = r.results.filter((x) => x.class !== 'history');
  const hist = r.results.filter((x) => x.class === 'history');
  // Counts are derived, never hardcoded: workloads are append-only, so a
  // magic number here would break every time the corpus grows.
  const singleIds = new Set(singles.map((x) => x.id)).size;
  const histIds = new Set(hist.map((x) => x.id)).size;
  assert.equal(singles.length, singleIds * SINGLE_CONDITIONS.length);
  assert.equal(hist.length, histIds * HISTORY_CONDITIONS.length);

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

test('history modes: delta never loses, distill wins only when history exceeds the brief cap', async () => {
  const out = mkdtempSync(join(tmpdir(), 'bench-hist-'));
  const distillCap = 400;
  const r = await runBenchmark({
    mode: 'offline', outDir: out, distillCap,
    conditions: [...HISTORY_CONDITIONS], log: quiet,
  });
  for (const row of r.results.filter((x) => x.condition === 'hist-full')) {
    assert.equal(row.input_delta_tokens, 0);
  }

  // Distill replaces the whole history with a brief; when the thread is
  // SHORTER than the brief cap, that trade is a loss. Asserting an
  // unconditional win would be asserting a marketing claim, so the test
  // encodes the real relationship instead.
  for (const row of r.results.filter((x) => x.condition === 'hist-distill')) {
    assert.equal(row.modeled, true, 'offline distill must be flagged modeled');
    assert.ok(row.one_time_distill_tokens_estimate > 0, 'one-time cost must be reported, not hidden');
    const beatsFull = row.input_delta_tokens < 0;
    const historyExceedsCap = row.tokens_in_full_history_estimate > distillCap;
    assert.equal(
      beatsFull, historyExceedsCap,
      `${row.id}: distill should win iff history (${row.tokens_in_full_history_estimate}) > cap (${distillCap})`
    );
  }

  for (const row of r.results.filter((x) => x.condition === 'hist-delta')) {
    assert.ok(row.input_delta_tokens <= 0, `delta must never exceed full history (${row.id})`);
  }

  // The corpus must contain restatement-heavy records, or DCC is untested.
  const dccActive = r.results.filter((x) => x.condition === 'hist-delta' && x.delta_dropped > 0);
  assert.ok(
    dccActive.length >= 3,
    `expected >=3 records where DCC drops a sentence, got ${dccActive.length}`
  );
});

test('dry-run projects calls and cost but writes and spends nothing', async () => {
  const n = 5;
  const r = await runBenchmark({ mode: 'dry-run', n, priceInPerMTok: 1.0, log: quiet });
  assert.equal(r.liveCalls, 0);
  assert.equal(r.writtenTo, null, 'dry-run must not write results');

  // Derived from the corpus, not hardcoded (workloads are append-only).
  const { singles, histories } = loadWorkloads(WORKLOADS_DIR);
  const probeCalls = histories.reduce((a, h) => a + h.probes.length, 0);
  const expected =
    singles.length * SINGLE_CONDITIONS.length * n +           // single-turn
    histories.length * HISTORY_CONDITIONS.length * n +        // history main calls
    probeCalls * HISTORY_CONDITIONS.length * n +              // probe calls
    histories.length;                                         // one distill call each
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
