// Adaptive directive injector — v2 (research-backed).
//
// v1 fixed caveman's net-negative failure mode: directives are tiny and
// only attached when predicted savings beat overhead. v2 makes the
// directives themselves smarter, per task class:
//
//  - reasoning  → Chain-of-Draft: ~5-word steps match or beat CoT accuracy
//                 at a fraction of the tokens (arXiv:2502.18600)
//  - coding     → YAGNI ladder (ponytail-style), only when code is the task
//  - budgets    → TALE-style "answer in ≤N tokens" with an elasticity
//                 floor: budgets set too low make models overshoot and
//                 cost MORE (arXiv:2412.18547), so never below 80
//  - writing    → budget only: brevity constraints help math/science most
//                 and prose/comprehension tasks least (arXiv:2604.00025),
//                 so the harsh fragment-terse directive is relaxed there

import { estimateTokens } from './estimator.js';
import { classify } from './refiner.js';
import { getParams } from './calibrator.js';

export const DIRECTIVES = {
  terse: {
    en: 'Reply ultra-terse: no preamble, no recap, no closing offers. Fragments OK. Keep code, commands, URLs, numbers exact.',
    id: 'Jawab super ringkas: tanpa pembuka, tanpa rangkuman ulang, tanpa tawaran penutup. Fragmen boleh. Kode, perintah, URL, angka harus persis.',
  },
  cod: {
    en: 'Reason as a numbered draft, each step \u22645 words; give the final answer after "####".',
    id: 'Bernalar sebagai draf bernomor, tiap langkah \u22645 kata; jawaban akhir setelah "####".',
  },
  yagni: {
    en: 'Code: simplest working solution. Prefer delete > reuse > stdlib > platform-native > new code. No unrequested abstractions or dependencies. Mark deliberate shortcuts with a `lazy:` comment naming the upgrade path.',
    id: 'Kode: solusi paling sederhana yang jalan. Urutan: hapus > pakai ulang > stdlib > fitur bawaan platform > kode baru. Tanpa abstraksi/dependensi yang tidak diminta. Tandai shortcut sengaja dengan komentar `lazy:` berisi jalur upgrade-nya.',
  },
};

// Conservative planning factor: the low end of community re-benchmarks
// (30–50%), never the 65–75% headline range.
const SAVINGS_FACTOR = 0.35;
// Token-elasticity guards [arXiv:2412.18547]: budgets set too low make
// models overshoot and cost more. Never ask for less than half the
// expected length, and never below 120 tokens absolute.
const BUDGET_FLOOR = 120;

/**
 * Decide whether to attach directives to this prompt.
 * @param {string} prompt
 * @param {{lang?: 'id'|'en', minExpectedTokens?: number, margin?: number,
 *          enableTerse?: boolean, enableYagni?: boolean,
 *          enableCoD?: boolean, enableBudget?: boolean,
 *          expectedTokens?: number, savingsFactor?: number,
 *          calibration?: object,
 *          provider?: 'openai'|'claude'|'generic'}} [opts]
 * @returns {{inject: boolean, directive: string, overheadTokens: number,
 *            expectedSavings: number, budgetTokens: number|null,
 *            classification: object, calibrated: boolean, reason: string}}
 */
export function decideInjection(prompt, opts = {}) {
  const {
    minExpectedTokens = 150,
    margin = 1.5,
    enableTerse = true,
    enableYagni = true,
    enableCoD = true,
    enableBudget = true,
    provider = 'generic',
  } = opts;

  const classification = classify(prompt);
  const lang = opts.lang || classification.lang;
  const cls = classification.type;

  // LAZY calibration: measured parameters override static defaults when
  // enough on-device samples exist; cold start = original behavior.
  let expected = classification.expectedTokens;
  let factor = SAVINGS_FACTOR;
  let calibrated = false;
  if (opts.calibration) {
    const p = getParams(opts.calibration, cls);
    if (p.expectedTokens != null) { expected = p.expectedTokens; calibrated = true; }
    if (p.savingsFactor != null) { factor = p.savingsFactor; calibrated = true; }
  }
  if (typeof opts.expectedTokens === 'number') expected = opts.expectedTokens;
  if (typeof opts.savingsFactor === 'number') factor = opts.savingsFactor;

  // Task-aware assembly: CoD replaces generic terseness for reasoning;
  // YAGNI only for coding; budget for everything except writing.
  const pieces = [];
  if (enableCoD && cls === 'reasoning') pieces.push(DIRECTIVES.cod[lang]);
  else if (enableTerse && cls !== 'writing') pieces.push(DIRECTIVES.terse[lang]);
  if (enableYagni && cls === 'coding') pieces.push(DIRECTIVES.yagni[lang]);

  let budgetTokens = null;
  if (enableBudget) {
    const keep = Math.max(0.5, 1 - factor);
    budgetTokens = Math.max(BUDGET_FLOOR, Math.round(expected * keep));
    pieces.push(lang === 'id' ? `Jawab dalam \u2264${budgetTokens} token.` : `Answer in \u2264${budgetTokens} tokens.`);
  }

  if (!pieces.length) {
    return { inject: false, directive: '', overheadTokens: 0, expectedSavings: 0, budgetTokens: null, classification, calibrated, reason: 'no directives enabled' };
  }

  const directive = pieces.join('\n');
  const overheadTokens = estimateTokens(directive, { provider });
  const expectedSavings = Math.round(expected * factor);

  if (expected < minExpectedTokens) {
    return { inject: false, directive: '', overheadTokens, expectedSavings: 0, budgetTokens: null, classification, calibrated, reason: `expected response ~${expected} tok < ${minExpectedTokens} floor — injecting would cost more than it saves` };
  }
  if (expectedSavings <= overheadTokens * margin) {
    return { inject: false, directive: '', overheadTokens, expectedSavings: 0, budgetTokens: null, classification, calibrated, reason: `predicted savings ${expectedSavings} tok ≤ overhead ${overheadTokens} × ${margin}` };
  }

  return { inject: true, directive, overheadTokens, expectedSavings, budgetTokens, classification, calibrated, reason: `predicted savings ${expectedSavings} tok > overhead ${overheadTokens} × ${margin}` };
}

/**
 * Attach a decided directive to a prompt (directive last: recency helps
 * instruction-following, and it keeps the user's words first for diffing).
 * @param {string} prompt
 * @param {string} directive
 */
export function attach(prompt, directive) {
  return directive ? `${prompt}\n\n[${directive}]` : prompt;
}
