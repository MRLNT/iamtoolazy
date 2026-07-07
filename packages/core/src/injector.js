// Adaptive directive injector.
//
// caveman's honest-numbers doc admits its skill adds ~1–1.5k input tokens
// per turn and can go net-negative on terse workloads. iamtoolazy fixes
// that two ways: the directives themselves are tiny (tens of tokens, not
// thousands), and they are only attached when predicted output savings
// beat the overhead with a safety margin. Short question → nothing is
// injected → cost is exactly zero.

import { estimateTokens } from './estimator.js';
import { classify } from './refiner.js';
import { getParams } from './calibrator.js';

export const DIRECTIVES = {
  terse: {
    en: 'Reply ultra-terse: no preamble, no recap, no closing offers. Fragments OK. Keep code, commands, URLs, numbers exact.',
    id: 'Jawab super ringkas: tanpa pembuka, tanpa rangkuman ulang, tanpa tawaran penutup. Fragmen boleh. Kode, perintah, URL, angka harus persis.',
  },
  yagni: {
    en: 'Code: simplest working solution. Prefer delete > reuse > stdlib > platform-native > new code. No unrequested abstractions or dependencies. Mark deliberate shortcuts with a `lazy:` comment naming the upgrade path.',
    id: 'Kode: solusi paling sederhana yang jalan. Urutan: hapus > pakai ulang > stdlib > fitur bawaan platform > kode baru. Tanpa abstraksi/dependensi yang tidak diminta. Tandai shortcut sengaja dengan komentar `lazy:` berisi jalur upgrade-nya.',
  },
};

// Fraction of expected output we conservatively assume terse mode removes.
// Community re-benchmarks of caveman put real-world output savings at
// 30–50%; we plan with 0.35, not the 65–75% headline.
const SAVINGS_FACTOR = 0.35;

/**
 * Decide whether to attach directives to this prompt.
 * @param {string} prompt
 * @param {{lang?: 'id'|'en', minExpectedTokens?: number, margin?: number,
 *          enableTerse?: boolean, enableYagni?: boolean,
 *          provider?: 'openai'|'claude'|'generic'}} [opts]
 * @returns {{inject: boolean, directive: string, overheadTokens: number,
 *            expectedSavings: number, classification: object, reason: string}}
 */
export function decideInjection(prompt, opts = {}) {
  const {
    minExpectedTokens = 150,
    margin = 1.5,
    enableTerse = true,
    enableYagni = true,
    provider = 'generic',
  } = opts;

  const classification = classify(prompt);
  const lang = opts.lang || classification.lang;

  // LAZY calibration: measured parameters override static defaults when
  // enough on-device samples exist; cold start = original behavior.
  let expected = classification.expectedTokens;
  let factor = SAVINGS_FACTOR;
  let calibrated = false;
  if (opts.calibration) {
    const p = getParams(opts.calibration, classification.type);
    if (p.expectedTokens != null) { expected = p.expectedTokens; calibrated = true; }
    if (p.savingsFactor != null) { factor = p.savingsFactor; calibrated = true; }
  }
  if (typeof opts.expectedTokens === 'number') expected = opts.expectedTokens;
  if (typeof opts.savingsFactor === 'number') factor = opts.savingsFactor;

  const pieces = [];
  if (enableTerse) pieces.push(DIRECTIVES.terse[lang]);
  if (enableYagni && classification.type === 'coding') pieces.push(DIRECTIVES.yagni[lang]);

  if (!pieces.length) {
    return { inject: false, directive: '', overheadTokens: 0, expectedSavings: 0, classification, reason: 'no directives enabled' };
  }

  const directive = pieces.join('\n');
  const overheadTokens = estimateTokens(directive, { provider });
  const expectedSavings = Math.round(expected * factor);

  if (expected < minExpectedTokens) {
    return { inject: false, directive: '', overheadTokens, expectedSavings: 0, classification, calibrated, reason: `expected response ~${expected} tok < ${minExpectedTokens} floor — injecting would cost more than it saves` };
  }
  if (expectedSavings <= overheadTokens * margin) {
    return { inject: false, directive: '', overheadTokens, expectedSavings: 0, classification, calibrated, reason: `predicted savings ${expectedSavings} tok ≤ overhead ${overheadTokens} × ${margin}` };
  }

  return { inject: true, directive, overheadTokens, expectedSavings, classification, calibrated, reason: `predicted savings ${expectedSavings} tok > overhead ${overheadTokens} × ${margin}` };
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
