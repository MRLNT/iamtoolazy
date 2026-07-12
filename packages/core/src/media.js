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
  const maxSide = opts.maxSide || 1092;
  const provider = opts.provider || 'claude';
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

export { imageTokens, resizeSavings };
