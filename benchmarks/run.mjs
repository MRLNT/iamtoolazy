// Benchmark runner — Fase 4.A.2.
//
// Three modes, in the order you should use them:
//   offline  (default)  input-side token metrics via the offline tokenizer.
//                       Deterministic, zero API calls, zero cost.
//   dry-run             projects live-run call counts and input tokens
//                       (plus dollar cost if --price-in/--price-out given)
//                       WITHOUT spending anything.
//   live                actually calls a provider, N repeats per record.
//
// Honesty rules baked in:
//   - every number in results is labeled estimate or measured;
//   - offline history-distill briefs are MODELED at the distill cap and
//     flagged as such — only live runs measure real briefs;
//   - E1 (no calibration) is identical to `iamtoolazy` in offline mode
//     (calibration only learns from live outputs) — the runner says so
//     instead of printing a fake ablation difference.
//
// Usage:
//   node benchmarks/run.mjs                          # offline, all conditions
//   node benchmarks/run.mjs --mode dry-run --n 5 --price-in 1.00 --price-out 5.00
//   node benchmarks/run.mjs --mode live --provider anthropic --model <id> --n 5

import { readFileSync, readdirSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  processPrompt,
  decideInjection,
  attach,
  estimateTokens,
  initTokenizer,
  estimatorMode,
  deltaCompress,
  DIRECTIVES,
  DISTILL_PROMPT,
  createCalibration,
  observe,
} from '@iamtoolazy/core';
import { makeProvider } from './providers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const SINGLE_CONDITIONS = [
  'baseline', 'be-brief', 'static-terse', 'yagni-only',
  'iamtoolazy', 'E1', 'E2', 'E3',
];
export const HISTORY_CONDITIONS = ['hist-full', 'hist-delta', 'hist-distill'];

const ONE_LINER = { en: 'Be brief.', id: 'Jawab singkat.' };
// E3 fixed budget: one universal constant instead of per-class/calibrated
// expectations — exactly the static behavior LAZY claims to improve on.
const E3_FIXED_EXPECTED_TOKENS = 500;

// ---------------------------------------------------------------- workloads

export function loadWorkloads(dir) {
  const singles = [];
  const histories = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort()) {
    const lines = readFileSync(join(dir, file), 'utf8').split('\n').filter((l) => l.trim());
    for (const line of lines) {
      const rec = JSON.parse(line);
      (rec.class === 'history' ? histories : singles).push(rec);
    }
  }
  return { singles, histories };
}

// --------------------------------------------------------------- conditions

/**
 * Transform a single-turn record under one condition.
 * Returns { messages, meta } — meta.injected reflects whether an output
 * directive was attached (used for calibration bookkeeping in live mode).
 */
export function applySingleCondition(condition, rec, { tokenProvider, calibration }) {
  const lang = rec.lang;
  const p = rec.prompt;
  const wrap = (text, meta = {}) => ({
    messages: [{ role: 'user', content: text }],
    meta,
  });

  switch (condition) {
    case 'baseline':
      return wrap(p, { injected: false });
    case 'be-brief':
      return wrap(`${p}\n\n${ONE_LINER[lang]}`, { injected: true });
    case 'static-terse':
      // Caveman-style: the terse directive attached unconditionally.
      return wrap(attach(p, DIRECTIVES.terse[lang]), { injected: true });
    case 'yagni-only':
      // Ponytail-style: the YAGNI ruleset attached unconditionally.
      return wrap(attach(p, DIRECTIVES.yagni[lang]), { injected: true });
    case 'iamtoolazy': {
      const r = processPrompt(p, { provider: tokenProvider, calibration });
      return wrap(r.output, {
        injected: Boolean(r.injection?.inject),
        classType: r.injection?.classification?.type ?? null,
        stages: r.stages.map((s) => s.stage),
      });
    }
    case 'E1': {
      // Ablation: full pipeline, calibration disabled.
      const r = processPrompt(p, { provider: tokenProvider, calibration: null });
      return wrap(r.output, {
        injected: Boolean(r.injection?.inject),
        classType: r.injection?.classification?.type ?? null,
        stages: r.stages.map((s) => s.stage),
      });
    }
    case 'E2': {
      // Ablation: net-positive guard OFF — always attach whatever directive
      // the injector would build. Composed here via public API; core stays
      // untouched.
      const r = processPrompt(p, { provider: tokenProvider, inject: false });
      const d = decideInjection(r.output, {
        provider: tokenProvider, margin: 0, minExpectedTokens: 0,
      });
      const text = d.directive ? attach(r.output, d.directive) : r.output;
      return wrap(text, {
        injected: Boolean(d.directive),
        classType: d.classification?.type ?? null,
      });
    }
    case 'E3': {
      // Ablation: fixed budgets — guard stays on, but the expected-length
      // estimate is a universal constant instead of adaptive.
      const r = processPrompt(p, { provider: tokenProvider, inject: false });
      const d = decideInjection(r.output, {
        provider: tokenProvider, expectedTokens: E3_FIXED_EXPECTED_TOKENS,
      });
      const text = d.inject ? attach(r.output, d.directive) : r.output;
      return wrap(text, {
        injected: d.inject,
        classType: d.classification?.type ?? null,
      });
    }
    default:
      throw new Error(`unknown single-turn condition "${condition}"`);
  }
}

/**
 * Transform a history record under one condition.
 * In offline/dry-run modes the distill brief is MODELED at distillCap
 * tokens (meta.modeled = true); live mode generates the real brief.
 */
export function applyHistoryCondition(condition, rec, { distillCap, brief }) {
  const lang = rec.lang;
  const turns = rec.turns.map((t) => ({ role: t.role, content: t.content }));
  const historyText = rec.turns.map((t) => t.content).join('\n');

  switch (condition) {
    case 'hist-full':
      return {
        messages: [...turns, { role: 'user', content: rec.final_prompt }],
        meta: { injected: false },
      };
    case 'hist-delta': {
      const d = deltaCompress(rec.final_prompt, historyText);
      return {
        messages: [...turns, { role: 'user', content: d.text }],
        meta: { injected: false, deltaDropped: d.dropped.length },
      };
    }
    case 'hist-distill': {
      if (brief != null) {
        return {
          messages: [
            { role: 'user', content: `Context from a previous thread:\n${brief}\n\n${rec.final_prompt}` },
          ],
          meta: { injected: false, modeled: false },
        };
      }
      // Modeled: brief assumed at the distill cap (a ceiling, not a
      // measurement). One-time distill cost is reported separately.
      const oneTimeTokens =
        estimateTokens(historyText) + estimateTokens(DISTILL_PROMPT[lang](distillCap));
      return {
        messages: [{ role: 'user', content: rec.final_prompt }],
        meta: { injected: false, modeled: true, modeledBriefTokens: distillCap, oneTimeTokens },
      };
    }
    default:
      throw new Error(`unknown history condition "${condition}"`);
  }
}

// ------------------------------------------------------------------ metrics

function tokensOfMessages(messages, tokenProvider) {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content, { provider: tokenProvider }), 0);
}

// -------------------------------------------------------------------- probes

/** Crude string-match verdict — labeled as such; 4.B is the real gate. */
export function probeVerdict(answer, expected) {
  const norm = (s) => String(s).toLowerCase().replace(/[.,;:!?"'()]/g, ' ').replace(/\s+/g, ' ').trim();
  const a = norm(answer);
  // Split expected into comma-separated fragments FIRST, then normalize
  // each — every fragment must appear somewhere in the answer. Numbers
  // like "1,800" survive because their normalized form appears in the
  // normalized answer the same way.
  const parts = String(expected).split(',').map((p) => norm(p)).filter(Boolean);
  return parts.every((p) => a.includes(p)) ? 'pass' : 'fail';
}

// -------------------------------------------------------------------- runner

export async function runBenchmark(opts = {}) {
  const {
    mode = 'offline',                       // offline | dry-run | live
    provider: providerName = 'mock',
    model = null,
    n = 5,
    conditions = null,                      // array or null = all
    workloadsDir = join(HERE, 'workloads'),
    outDir = null,
    distillCap = 400,
    priceInPerMTok = null,
    priceOutPerMTok = null,
    filter = null,                          // substring match on record id
    maxTokens = 1024,
    log = console.log,
  } = opts;

  if (!['offline', 'dry-run', 'live'].includes(mode)) {
    throw new Error(`unknown mode "${mode}"`);
  }

  await initTokenizer();
  const tokenProvider = providerName === 'anthropic' ? 'claude' : 'generic';

  let { singles, histories } = loadWorkloads(workloadsDir);
  if (filter) {
    singles = singles.filter((r) => r.id.includes(filter));
    histories = histories.filter((r) => r.id.includes(filter));
  }

  const singleConds = (conditions ?? SINGLE_CONDITIONS).filter((c) => SINGLE_CONDITIONS.includes(c));
  const histConds = (conditions ?? HISTORY_CONDITIONS).filter((c) => HISTORY_CONDITIONS.includes(c));

  const effectiveN = mode === 'offline' ? 1 : n;
  // Projections always use the REQUESTED n — an offline run must project
  // the same live cost as a dry-run with the same flags.
  const projN = n;
  const runId = `${mode}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const results = [];
  const notes = [];

  if (mode === 'offline') {
    notes.push('offline mode: transformations are deterministic — n forced to 1');
    if (singleConds.includes('E1') && singleConds.includes('iamtoolazy')) {
      notes.push('offline mode: E1 (no calibration) is identical to iamtoolazy — calibration only learns from live outputs');
    }
    if (histConds.includes('hist-distill')) {
      notes.push(`offline mode: hist-distill briefs are MODELED at the ${distillCap}-token cap (ceiling, not a measurement)`);
    }
  }

  const provider = mode === 'live' ? makeProvider(providerName, { model }) : null;
  // Live-mode calibration state for the `iamtoolazy` condition only:
  // LAZY's Learn/Adapt loop needs real outputs to observe.
  const calibration = mode === 'live' ? createCalibration() : null;

  let liveCalls = 0;
  let projectedCalls = 0;
  let projectedInputTokens = 0;

  // ---- single-turn records
  for (const cond of singleConds) {
    for (const rec of singles) {
      const { messages, meta } = applySingleCondition(cond, rec, {
        tokenProvider,
        calibration: cond === 'iamtoolazy' ? calibration : null,
      });
      const tokensIn = tokensOfMessages(messages, tokenProvider);
      const tokensBaseline = estimateTokens(rec.prompt, { provider: tokenProvider });
      const base = {
        run_id: runId, mode, condition: cond,
        id: rec.id, class: rec.class, lang: rec.lang,
        tokens_in_estimate: tokensIn,
        tokens_in_baseline_estimate: tokensBaseline,
        input_delta_tokens: tokensIn - tokensBaseline,
        injected: meta.injected ?? null,
        stages: meta.stages ?? null,
      };
      projectedCalls += projN;
      projectedInputTokens += tokensIn * projN;

      if (mode !== 'live') {
        results.push({ ...base, n_index: 0 });
        continue;
      }
      for (let i = 0; i < effectiveN; i++) {
        const r = await provider.complete(messages, { maxTokens });
        liveCalls += 1;
        results.push({
          ...base, n_index: i,
          tokens_in_measured: r.inputTokens,
          tokens_out_measured: r.outputTokens,
          latency_ms: r.latencyMs,
        });
        if (cond === 'iamtoolazy' && meta.classType && r.outputTokens) {
          observe(calibration, {
            classType: meta.classType,
            injected: Boolean(meta.injected),
            actualTokens: r.outputTokens,
          });
        }
      }
    }
  }

  // ---- history records
  for (const cond of histConds) {
    for (const rec of histories) {
      let brief = null;
      if (mode === 'live' && cond === 'hist-distill') {
        // One real distill call per record, reused across the N repeats —
        // that is also how a user would pay for it.
        const distillMessages = [
          ...rec.turns.map((t) => ({ role: t.role, content: t.content })),
          { role: 'user', content: DISTILL_PROMPT[rec.lang](distillCap) },
        ];
        const d = await provider.complete(distillMessages, { maxTokens: distillCap * 2 });
        liveCalls += 1;
        brief = d.text;
      }

      const { messages, meta } = applyHistoryCondition(cond, rec, { distillCap, brief });
      let tokensIn = tokensOfMessages(messages, tokenProvider);
      if (meta.modeled) tokensIn += meta.modeledBriefTokens; // ceiling for the brief
      const fullTokens = tokensOfMessages(
        [...rec.turns.map((t) => ({ role: t.role, content: t.content })),
         { role: 'user', content: rec.final_prompt }],
        tokenProvider
      );
      const base = {
        run_id: runId, mode, condition: cond,
        id: rec.id, class: rec.class, lang: rec.lang,
        tokens_in_estimate: tokensIn,
        tokens_in_full_history_estimate: fullTokens,
        input_delta_tokens: tokensIn - fullTokens,
        modeled: meta.modeled ?? false,
        one_time_distill_tokens_estimate: meta.oneTimeTokens ?? null,
        delta_dropped: meta.deltaDropped ?? null,
      };
      const probeCalls = rec.probes.length;
      projectedCalls += projN * (1 + probeCalls) + (cond === 'hist-distill' ? 1 : 0);
      projectedInputTokens += tokensIn * projN;

      if (mode !== 'live') {
        results.push({ ...base, n_index: 0 });
        continue;
      }
      for (let i = 0; i < effectiveN; i++) {
        const r = await provider.complete(messages, { maxTokens });
        liveCalls += 1;
        const probeResults = [];
        for (const probe of rec.probes) {
          const probeMessages = [
            ...messages,
            { role: 'assistant', content: r.text },
            { role: 'user', content: probe.question },
          ];
          const pr = await provider.complete(probeMessages, { maxTokens: 200 });
          liveCalls += 1;
          probeResults.push({
            probe_id: probe.id,
            verdict: probeVerdict(pr.text, probe.expected),
            verdict_method: 'string-match (crude — 4.B protocol is the real gate)',
          });
        }
        results.push({
          ...base, n_index: i,
          tokens_in_measured: r.inputTokens,
          tokens_out_measured: r.outputTokens,
          latency_ms: r.latencyMs,
          probes: probeResults,
        });
      }
    }
  }

  // ---- projection / summary
  const projection = {
    records: { single: singles.length, history: histories.length },
    conditions: { single: singleConds, history: histConds },
    n: projN,
    projected_live_calls: projectedCalls,
    projected_input_tokens_estimate: projectedInputTokens,
    projected_input_cost:
      priceInPerMTok != null
        ? Number(((projectedInputTokens / 1e6) * priceInPerMTok).toFixed(4))
        : null,
    cost_note:
      'input-side lower bound; output tokens are not projectable before a live run' +
      (priceOutPerMTok != null ? ` (output priced at ${priceOutPerMTok}/MTok once measured)` : ''),
    estimator: estimatorMode(),
  };

  // ---- write results (offline and live persist; dry-run never writes)
  let writtenTo = null;
  if (mode !== 'dry-run') {
    const dir = outDir ?? join(HERE, 'results', runId);
    mkdirSync(dir, { recursive: true });
    const byCondition = new Map();
    for (const row of results) {
      if (!byCondition.has(row.condition)) byCondition.set(row.condition, []);
      byCondition.get(row.condition).push(row);
    }
    for (const [cond, rows] of byCondition) {
      const file = join(dir, `${cond}.jsonl`);
      writeFileSync(file, '');
      for (const row of rows) appendFileSync(file, JSON.stringify(row) + '\n');
    }
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({
      run_id: runId, mode, provider: providerName, model,
      n: effectiveN, distill_cap: distillCap,
      estimator: estimatorMode(),
      notes,
      note: 'all *_estimate fields use the offline tokenizer; *_measured fields come from provider usage',
      created_at: new Date().toISOString(),
    }, null, 2) + '\n');
    writtenTo = dir;
  }

  for (const note of notes) log(`note: ${note}`);
  log(`${mode}: ${results.length} result rows, ${liveCalls} live calls made, ` +
      `${projection.projected_live_calls} projected for a live run (n=${projN})` +
      (writtenTo ? ` → ${writtenTo}` : ' (dry-run: nothing written, nothing spent)'));
  if (mode === 'dry-run') {
    log(`projected input tokens (estimate, lower bound): ${projection.projected_input_tokens_estimate}`);
    if (projection.projected_input_cost != null) {
      log(`projected input cost (estimate): ${projection.projected_input_cost} at ${priceInPerMTok}/MTok input`);
    } else {
      log('pass --price-in <per-MTok> to project input cost in currency');
    }
    log(projection.cost_note);
  }

  return { runId, mode, results, projection, notes, writtenTo, liveCalls };
}

// ---------------------------------------------------------------------- CLI

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    const val = next !== undefined && !next.startsWith('--') ? argv[++i] : true;
    out[key] = val;
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = parseArgs(process.argv.slice(2));
  runBenchmark({
    mode: a.mode ?? 'offline',
    provider: a.provider ?? 'mock',
    model: a.model ?? null,
    n: a.n ? Number(a.n) : 5,
    conditions: a.conditions ? String(a.conditions).split(',') : null,
    workloadsDir: a.workloads ?? undefined,
    outDir: a.out ?? null,
    distillCap: a['distill-cap'] ? Number(a['distill-cap']) : 400,
    priceInPerMTok: a['price-in'] != null ? Number(a['price-in']) : null,
    priceOutPerMTok: a['price-out'] != null ? Number(a['price-out']) : null,
    filter: a.filter ?? null,
  }).catch((err) => {
    console.error(`FAIL ${err.message}`);
    process.exit(1);
  });
}
