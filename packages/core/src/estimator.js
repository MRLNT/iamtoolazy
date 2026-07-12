// Token estimator — honest by design.
//
// OpenAI-family counts use gpt-tokenizer (o200k_base) when it loads.
// Anthropic's tokenizer is not public, so 'claude' applies a calibration
// factor on top and every number from this module should be labeled an
// ESTIMATE in any UI. We would rather show a rough number with a caveat
// than a precise-looking wrong one — that is the whole lesson of the
// caveman marketing backlash.

let countFn = null;
let initStarted = false;

/**
 * Load gpt-tokenizer if present. Safe to call multiple times.
 * @returns {Promise<boolean>} true if the real tokenizer is active
 */
export async function initTokenizer() {
  if (initStarted) return !!countFn;
  initStarted = true;
  try {
    const mod = await import('gpt-tokenizer/encoding/o200k_base');
    countFn = mod.countTokens;
  } catch {
    countFn = null; // heuristic fallback keeps everything working
  }
  return !!countFn;
}

const CLAUDE_FACTOR = 1.15; // documented approximation, not a spec

function heuristic(text) {
  // chars/4 is the classic rough rule for English-like text.
  return Math.max(1, Math.ceil(String(text).length / 4));
}

/**
 * Estimate token count for text.
 * @param {string} text
 * @param {{provider?: 'openai'|'claude'|'generic'}} [opts]
 * @returns {number}
 */
export function estimateTokens(text, opts = {}) {
  const base = countFn ? countFn(String(text)) : heuristic(text);
  return opts.provider === 'claude' ? Math.ceil(base * CLAUDE_FACTOR) : base;
}

/** @returns {'tokenizer'|'heuristic'} which engine produced the numbers */
export function estimatorMode() {
  return countFn ? 'tokenizer' : 'heuristic';
}

/**
 * Estimate vision tokens for an image.
 * Claude: ≈ (w×h)/750, capped (~1.15 MP is the effective ceiling).
 * OpenAI (high detail): scale into 2048px box, shortest side 768, then
 * 85 + 170 per 512px tile. Low detail: flat 85.
 * Gemini (2.x): ≤384px both dims = flat 258; larger images are scaled to
 * fit 3072×3072 (aspect preserved), then tiled into 768×768 crops at
 * 258 tokens each — per ai.google.dev/gemini-api/docs/tokens.
 * @param {number} width
 * @param {number} height
 * @param {{provider?: 'claude'|'openai'|'gemini', detail?: 'high'|'low'}} [opts]
 */
export function imageTokens(width, height, opts = {}) {
  const provider = opts.provider || 'claude';
  let w = Math.max(1, Math.round(width));
  let h = Math.max(1, Math.round(height));

  if (provider === 'claude') {
    return Math.min(1600, Math.ceil((w * h) / 750));
  }

  if (provider === 'gemini') {
    if (w <= 384 && h <= 384) return 258;
    const fit = 3072 / Math.max(w, h);
    if (fit < 1) { w = Math.round(w * fit); h = Math.round(h * fit); }
    return Math.ceil(w / 768) * Math.ceil(h / 768) * 258;
  }

  if (opts.detail === 'low') return 85;
  const fitLong = 2048 / Math.max(w, h);
  if (fitLong < 1) { w = Math.round(w * fitLong); h = Math.round(h * fitLong); }
  const fitShort = 768 / Math.min(w, h);
  if (fitShort < 1) { w = Math.round(w * fitShort); h = Math.round(h * fitShort); }
  const tiles = Math.ceil(w / 512) * Math.ceil(h / 512);
  return 85 + 170 * tiles;
}

/**
 * Token savings from resizing an image so its longest side is maxSide.
 * This is the extension's media-optimizer math: resolution down = real,
 * measurable vision-token savings.
 * @param {number} width
 * @param {number} height
 * @param {number} maxSide e.g. 1092 for a good quality/size balance
 * @param {{provider?: 'claude'|'openai'}} [opts]
 */
export function resizeSavings(width, height, maxSide, opts = {}) {
  const before = imageTokens(width, height, opts);
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const after = imageTokens(Math.round(width * scale), Math.round(height * scale), opts);
  return { before, after, saved: Math.max(0, before - after), scale };
}
