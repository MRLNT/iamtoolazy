#!/usr/bin/env node
// iamtoolazy — honest ledger summary. All token counts are chars/4 ESTIMATES.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.iamtoolazy');
let lines = [];
try { lines = readFileSync(join(DIR, 'stats.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)); } catch { /* empty */ }

if (!lines.length) {
  console.log('iamtoolazy ledger: empty. Use Claude Code normally — decisions land here automatically.');
  process.exit(0);
}

const dec = lines.filter((l) => l.t === 'decide');
const obs = lines.filter((l) => l.t === 'observe');
const injected = dec.filter((d) => d.inject);
const skipped = dec.length - injected.length;
const overhead = injected.reduce((a, d) => a + (d.overhead || 0), 0);
const predicted = injected.reduce((a, d) => a + (d.predictedSavings || 0), 0);

const byClass = {};
for (const o of obs) {
  const c = (byClass[o.class] ??= { plain: [], injected: [] });
  c[o.injected ? 'injected' : 'plain'].push(o.actualTokens);
}
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);

console.log('iamtoolazy — honest ledger (all numbers are estimates, chars/4)');
console.log('---------------------------------------------------------------');
console.log(`prompts seen        ${dec.length}`);
console.log(`directives injected ${injected.length}  (skipped as net-negative or below floor: ${skipped})`);
console.log(`input overhead paid ${overhead} tok`);
console.log(`predicted savings   ${predicted} tok   → predicted net ${predicted - overhead >= 0 ? '+' : ''}${predicted - overhead} tok`);
let measured = '';
for (const [k, v] of Object.entries(byClass)) {
  const p = avg(v.plain); const i = avg(v.injected);
  if (p != null && i != null) measured += `  ${k}: plain avg ${p} vs injected avg ${i} tok (n=${v.plain.length}/${v.injected.length})\n`;
}
if (measured) { console.log('measured responses (LAZY calibration):'); process.stdout.write(measured); }
else console.log('measured responses: not enough samples yet (calibration warms up at n\u22653 per class)');
console.log('---------------------------------------------------------------');
console.log('predicted ≠ realized; the Fase 4 benchmark reports the gap honestly.');
