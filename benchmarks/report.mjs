// Report generator — Fase 4.A.3.
//
// Renders RESULTS.md from a committed run directory (raw JSONL + meta.json).
// NEVER makes API calls — CI and readers only ever see committed results.
//
// What it prints that others don't: the input-overhead column. Every
// condition's added input tokens are shown next to its output savings,
// because a directive that costs more than it saves is a loss, not a win.
//
// Usage:
//   node benchmarks/report.mjs --in benchmarks/results/<run-id> [--out RESULTS.md]
//   (default --out: <in>/RESULTS.md)

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ------------------------------------------------------------------ loading

export function loadRun(dir) {
  const metaPath = join(dir, 'meta.json');
  if (!existsSync(metaPath)) throw new Error(`no meta.json in ${dir} — is this a run directory?`);
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const rows = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort()) {
    for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
      if (line.trim()) rows.push(JSON.parse(line));
    }
  }
  return { meta, rows };
}

// -------------------------------------------------------------------- stats

function stats(values) {
  const v = values.filter((x) => Number.isFinite(x));
  if (!v.length) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return { mean: Math.round(mean * 10) / 10, min: Math.min(...v), max: Math.max(...v), n: v.length };
}

const fmtSpread = (s) => (s ? `${s.mean} (${s.min}…${s.max})` : '—');
const fmtPct = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;

// ---------------------------------------------------------------- summarize

export function summarize(rows) {
  const singles = rows.filter((r) => r.class !== 'history');
  const hist = rows.filter((r) => r.class === 'history');

  const byCond = (list) => {
    const m = new Map();
    for (const r of list) {
      if (!m.has(r.condition)) m.set(r.condition, []);
      m.get(r.condition).push(r);
    }
    return m;
  };

  const single = [];
  for (const [condition, list] of byCond(singles)) {
    const records = new Set(list.map((r) => r.id)).size;
    const totalIn = list.reduce((a, r) => a + r.tokens_in_estimate, 0);
    const totalBase = list.reduce((a, r) => a + r.tokens_in_baseline_estimate, 0);
    single.push({
      condition,
      records,
      runs: list.length,
      inputDelta: stats(list.map((r) => r.input_delta_tokens)),
      inputVsBaselinePct: totalBase ? totalIn / totalBase - 1 : 0,
      injectedRate: list.filter((r) => r.injected === true).length / list.length,
      out: stats(list.map((r) => r.tokens_out_measured)),
    });
  }

  const history = [];
  for (const [condition, list] of byCond(hist)) {
    const records = new Set(list.map((r) => r.id)).size;
    const totalIn = list.reduce((a, r) => a + r.tokens_in_estimate, 0);
    const totalFull = list.reduce((a, r) => a + r.tokens_in_full_history_estimate, 0);

    // Probe stability: for each (record, probe), collect verdicts across
    // the N repeats. One verdict → stable; a flip → unstable, counted
    // neither as pass nor fail.
    const verdicts = new Map(); // `${id}::${probe_id}` -> Set(verdicts)
    for (const r of list) {
      for (const p of r.probes ?? []) {
        const key = `${r.id}::${p.probe_id}`;
        if (!verdicts.has(key)) verdicts.set(key, new Set());
        verdicts.get(key).add(p.verdict);
      }
    }
    let stablePass = 0, stableFail = 0, unstable = 0;
    for (const set of verdicts.values()) {
      if (set.size > 1) unstable += 1;
      else if (set.has('pass')) stablePass += 1;
      else stableFail += 1;
    }

    history.push({
      condition,
      records,
      runs: list.length,
      inputVsFullPct: totalFull ? totalIn / totalFull - 1 : 0,
      modeledCount: list.filter((r) => r.modeled).length,
      oneTime: stats(list.map((r) => r.one_time_distill_tokens_estimate)),
      out: stats(list.map((r) => r.tokens_out_measured)),
      probes: verdicts.size ? { total: verdicts.size, stablePass, stableFail, unstable } : null,
    });
  }

  const order = (arr) => arr.sort((a, b) => a.condition.localeCompare(b.condition));
  return { single: order(single), history: order(history) };
}

// ------------------------------------------------------------------- render

export function renderMarkdown(summary, meta) {
  const L = [];
  L.push(`# Benchmark results — \`${meta.run_id}\``, '');
  L.push(`- mode: **${meta.mode}** · provider: ${meta.provider ?? '—'}${meta.model ? ` (${meta.model})` : ''} · repeats per record: n=${meta.n}`);
  L.push(`- token estimator: **${meta.estimator}** (offline; \`*_estimate\` fields) — \`*_measured\` fields come from provider usage`);
  L.push(`- generated from committed raw JSONL only; this report makes no API calls`);
  L.push('');
  if (meta.notes?.length) {
    L.push('## Run notes (verbatim from the runner)', '');
    for (const n of meta.notes) L.push(`- ${n}`);
    L.push('');
  }

  if (summary.single.length) {
    L.push('## Single-turn conditions — input side', '');
    L.push('| condition | records | rows | input Δ tokens mean (min…max) | input vs baseline | injected |');
    L.push('|---|---|---|---|---|---|');
    for (const s of summary.single) {
      L.push(`| ${s.condition} | ${s.records} | ${s.runs} | ${fmtSpread(s.inputDelta)} | ${fmtPct(s.inputVsBaselinePct)} | ${(s.injectedRate * 100).toFixed(0)}% |`);
    }
    L.push('', '*Input Δ is the overhead column: tokens each condition ADDS to (or removes from) every prompt. All values are tokenizer estimates.*', '');

    if (summary.single.some((s) => s.out)) {
      L.push('## Single-turn conditions — output side (measured)', '');
      L.push('| condition | output tokens mean (min…max) |');
      L.push('|---|---|');
      for (const s of summary.single) L.push(`| ${s.condition} | ${fmtSpread(s.out)} |`);
      L.push('');
    }
  }

  if (summary.history.length) {
    L.push('## History modes', '');
    L.push('| condition | records | rows | input vs full history | modeled rows | one-time distill tokens mean (min…max) | output tokens mean (min…max) |');
    L.push('|---|---|---|---|---|---|---|');
    for (const h of summary.history) {
      L.push(`| ${h.condition} | ${h.records} | ${h.runs} | ${fmtPct(h.inputVsFullPct)} | ${h.modeledCount} | ${fmtSpread(h.oneTime)} | ${fmtSpread(h.out)} |`);
    }
    L.push('', '*"Modeled" rows use the distill-cap ceiling instead of a real brief — a modeled number is never a measurement.*', '');

    if (summary.history.some((h) => h.probes)) {
      L.push('## Probe stability (fidelity across repeats)', '');
      L.push('| condition | probes | stable pass | stable fail | unstable |');
      L.push('|---|---|---|---|---|');
      for (const h of summary.history) {
        if (!h.probes) continue;
        L.push(`| ${h.condition} | ${h.probes.total} | ${h.probes.stablePass} | ${h.probes.stableFail} | **${h.probes.unstable}** |`);
      }
      L.push('', '*A probe whose verdict flips between repeat runs is counted UNSTABLE — neither pass nor fail. Verdicts are crude string matches; the 4.B blind protocol is the real quality gate.*', '');
    }
  }

  L.push('## Limitations', '');
  L.push('- Workloads are cleaner than wild prompts (author-written, mostly typo-free; a few informal-register records are the exception, not the rule).');
  L.push('- Input-side numbers use the offline tokenizer; provider tokenizers differ (Claude counts are calibrated estimates).');
  L.push('- Output-side and probe numbers are only meaningful for the specific model of the run; do not generalize across models.');
  L.push('- String-match probe verdicts under-credit paraphrased answers; treat stability flags, not raw pass rates, as the signal.');
  L.push('');
  return L.join('\n');
}

// ---------------------------------------------------------------------- CLI

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  const get = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : null;
  };
  const inDir = get('--in');
  if (!inDir) {
    console.error('usage: node benchmarks/report.mjs --in <run-dir> [--out <file>]');
    process.exit(1);
  }
  try {
    const { meta, rows } = loadRun(inDir);
    const md = renderMarkdown(summarize(rows), meta);
    const outFile = get('--out') ?? join(inDir, 'RESULTS.md');
    writeFileSync(outFile, md);
    console.log(`wrote ${outFile} (${rows.length} rows)`);
  } catch (err) {
    console.error(`FAIL ${err.message}`);
    process.exit(1);
  }
}
