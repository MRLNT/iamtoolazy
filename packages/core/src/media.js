// LAZY · Media savers — the pure math behind the extension's media
// interceptor (Fase 3.F). No DOM, no canvas: given image dimensions,
// decide what is worth downscaling and by how much. The browser side
// only executes the plan; the decision lives here where it can be tested.

import { imageTokens, resizeSavings } from './estimator.js';

/**
 * Plan a confirm-first downscale for a set of attached images.
 * @param {{name?: string, width: number, height: number, type?: string}[]} images
 * @param {{maxSide?: number, provider?: 'claude'|'openai', minSaved?: number}} [opts]
 *   maxSide  — longest side after downscale (default 1092: Claude's
 *              effective ~1.15 MP ceiling for a 4:3 frame; bigger only
 *              costs tokens, it does not add model-visible detail)
 *   minSaved — offer the downscale only when the TOTAL estimated saving
 *              reaches this many tokens (default 50; below that the
 *              overlay would be noise — anti net-negative, as ever)
 * @returns {{items: Array, totalBefore: number, totalAfter: number,
 *            totalSaved: number, shouldOffer: boolean}}
 *   items[i]: {name, width, height, targetWidth, targetHeight,
 *              before, after, saved, scale, shrink}
 */
export function planImageDownscale(images, opts = {}) {
  const provider = opts.provider || 'claude';
  // Default detail ceiling per provider: Claude ~1092px (≈1.15 MP cap);
  // Gemini 768px (the tile boundary — one 768×768 tile = 258 tokens, the
  // floor for any non-tiny image). OpenAI normalizes server-side, so no
  // client-side target helps there (savings compute to ~0 and no offer
  // is made — see the media tests).
  const maxSide = opts.maxSide || (provider === 'gemini' ? 768 : 1092);
  const minSaved = typeof opts.minSaved === 'number' ? opts.minSaved : 50;

  const items = (images || []).map((img) => {
    const width = Math.max(1, Math.round(img.width));
    const height = Math.max(1, Math.round(img.height));
    const { before, after, saved, scale } = resizeSavings(width, height, maxSide, { provider });
    return {
      name: img.name || 'image',
      width,
      height,
      targetWidth: Math.max(1, Math.round(width * scale)),
      targetHeight: Math.max(1, Math.round(height * scale)),
      before,
      after,
      saved,
      scale,
      shrink: scale < 1 && saved > 0,
    };
  });

  const totalBefore = items.reduce((a, i) => a + i.before, 0);
  const totalAfter = items.reduce((a, i) => a + (i.shrink ? i.after : i.before), 0);
  const totalSaved = totalBefore - totalAfter;

  return {
    items,
    totalBefore,
    totalAfter,
    totalSaved,
    shouldOffer: items.some((i) => i.shrink) && totalSaved >= minSaved,
  };
}

/**
 * Local-processing guardrails (Fase 3.F.1). These are OUR limits — what
 * this extension will decode/parse inside the tab — not the chat sites'
 * upload limits, which each site enforces (and changes) on its own.
 * Oversized files always PASS THROUGH untouched; we never block an upload.
 */
export const MEDIA_LIMITS = {
  imageMaxMB: 40, // beyond this we skip local decode (createImageBitmap cost)
  pdfMaxMB: 25, // beyond this we skip local extraction
  pdfMaxPages: 300, // beyond this we skip local extraction
};

/**
 * Pure check for the PDF extraction guardrails.
 * @param {{sizeBytes?: number, numPages?: number}} info
 * @returns {{ok: boolean, reason: string|null}} reason is user-facing
 */
export function withinPdfLimits(info = {}) {
  const mb = (info.sizeBytes || 0) / (1024 * 1024);
  if (mb > MEDIA_LIMITS.pdfMaxMB) {
    return { ok: false, reason: `larger than ${MEDIA_LIMITS.pdfMaxMB} MB` };
  }
  if (typeof info.numPages === 'number' && info.numPages > MEDIA_LIMITS.pdfMaxPages) {
    return { ok: false, reason: `more than ${MEDIA_LIMITS.pdfMaxPages} pages` };
  }
  return { ok: true, reason: null };
}

export { imageTokens, resizeSavings };
