import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBenchmark } from '../run.mjs';
import { loadRun, summarize, renderMarkdown } from '../report.mjs';

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'sample-live-run');
const quiet = () => {};

test('report renders a real offline run: overhead column, notes, no output section', async () => {
  const out = mkdtempSync(join(tmpdir(), 'report-offline-'));
  await runBenchmark({
    mode: 'offline', outDir: out,
    conditions: ['baseline', 'be-brief', 'iamtoolazy', 'hist-full', 'hist-distill'],
    log: quiet,
  });
  const { meta, rows } = loadRun(out);
  const summary = summarize(rows);
  const md = renderMarkdown(summary, meta);

  const baseline = summary.single.find((s) => s.condition === 'baseline');
  assert.equal(baseline.inputDelta.mean, 0);
  assert.equal(baseline.inputDelta.min, 0);
  const beBrief = summary.single.find((s) => s.condition === 'be-brief');
  assert.ok(beBrief.inputDelta.min > 0, 'be-brief overhead must be visible in the report');

  assert.match(md, /input Δ tokens mean \(min…max\)/, 'overhead column present');
  assert.match(md, /MODELED at the 400-token cap/, 'runner honesty notes carried verbatim');
  assert.doesNotMatch(md, /output side \(measured\)/, 'offline report must not fake an output section');
  assert.match(md, /## Limitations/);
});

test('report on live fixture: mean±spread, modeled=0, unstable probe counted neither pass nor fail', () => {
  const { meta, rows } = loadRun(FIXTURE);
  const summary = summarize(rows);
  const md = renderMarkdown(summary, meta);

  const lazy = summary.single.find((s) => s.condition === 'iamtoolazy');
  assert.deepEqual(
    { mean: lazy.out.mean, min: lazy.out.min, max: lazy.out.max },
    { mean: 122.5, min: 120, max: 125 },
    'output spread is mean (min…max) across repeats'
  );

  const hist = summary.history.find((h) => h.condition === 'hist-full');
  assert.deepEqual(hist.probes, { total: 3, stablePass: 1, stableFail: 1, unstable: 1 });
  assert.match(md, /\*\*1\*\*/, 'unstable count rendered bold');
  assert.match(md, /counted UNSTABLE — neither pass nor fail/);
  assert.match(md, /output side \(measured\)/, 'live report includes the measured output table');
});

test('loadRun refuses a directory without meta.json', () => {
  const empty = mkdtempSync(join(tmpdir(), 'report-empty-'));
  assert.throws(() => loadRun(empty), /no meta\.json/);
});
