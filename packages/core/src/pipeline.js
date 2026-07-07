// The auto-mode pipeline: what runs when the user hits send.
//
//   raw prompt
//     → compress (caveman on the input side; style only, meaning-safe)
//     → refine   (PCTF structure or task-first tighten; retry killer)
//     → inject   (terse/YAGNI directive, only if savings > overhead)
//     → report   (everything the preview diff needs)
//
// Order matters: compress FIRST, so greetings, "please", and "thanks!"
// are gone before extraction — otherwise "Hi!" can get misread as the
// task. Refine then reorganizes clean sentences, inject appends last.
// Each stage is individually toggleable to match the onboarding wizard.

import { refine } from './refiner.js';
import { compress } from './compressor.js';
import { deltaCompress } from './delta.js';
import { decideInjection, attach } from './injector.js';
import { estimateTokens } from './estimator.js';

/**
 * @typedef {object} PipelineOptions
 * @property {boolean} [refine=true]
 * @property {'auto'|'structure'|'tighten'} [refineMode='auto']
 * @property {boolean} [compress=true]
 * @property {'lite'|'full'|'ultra'} [compressLevel='full']
 * @property {boolean} [inject=true]
 * @property {boolean} [enableYagni=true]
 * @property {'openai'|'claude'|'generic'} [provider='generic']
 */

/**
 * Run the full input-side pipeline on a prompt.
 * @param {string} rawPrompt
 * @param {PipelineOptions} [opts]
 */
export function processPrompt(rawPrompt, opts = {}) {
  const {
    refine: doRefine = true,
    refineMode = 'auto',
    compress: doCompress = true,
    compressLevel = 'full',
    inject: doInject = true,
    enableYagni = true,
    provider = 'generic',
    history = '',
    calibration = null,
  } = opts;

  const stages = [];
  let text = String(rawPrompt);

  // LAZY · Zero-waste: drop only what the visible conversation already
  // established. No history → no-op.
  let deltaResult = null;
  if (history) {
    deltaResult = deltaCompress(text, history);
    text = deltaResult.text;
    if (deltaResult.dropped.length) {
      stages.push({ stage: 'delta', dropped: deltaResult.dropped.length });
    }
  }

  let compressResult = null;
  if (doCompress) {
    compressResult = compress(text, { level: compressLevel });
    text = compressResult.text;
    if (compressResult.removed.length) {
      stages.push({ stage: 'compress', removed: compressResult.removed.length });
    }
  }

  let refineResult = null;
  if (doRefine) {
    refineResult = refine(text, { mode: refineMode });
    if (refineResult.applied !== 'none') {
      text = refineResult.refined;
      stages.push({ stage: 'refine', applied: refineResult.applied });
    }
  }

  let injection = null;
  if (doInject) {
    injection = decideInjection(text, { enableYagni, provider, calibration });
    if (injection.inject) {
      text = attach(text, injection.directive);
      stages.push({ stage: 'inject', expectedSavings: injection.expectedSavings });
    }
  }

  const tokensBefore = estimateTokens(rawPrompt, { provider });
  const tokensAfter = estimateTokens(text, { provider });

  return {
    input: String(rawPrompt),
    output: text,
    stages,
    delta: deltaResult,
    refine: refineResult,
    compress: compressResult,
    injection,
    tokens: {
      before: tokensBefore,
      after: tokensAfter,
      // Input delta can be positive (structure/directive added). The honest
      // ledger nets it against predicted output savings — never hide it.
      inputDelta: tokensAfter - tokensBefore,
      predictedOutputSavings: injection?.inject ? injection.expectedSavings : 0,
      predictedNet:
        (injection?.inject ? injection.expectedSavings : 0) - (tokensAfter - tokensBefore),
      estimateNote: 'estimates — see docs/honest-numbers.md',
    },
  };
}
