// @iamtoolazy/core — too lazy to waste tokens.
// Shared engine for the browser extension and the CLI plugin.

export { detectLang } from './lang.js';
export { mask, unmask } from './protect.js';
export { compress } from './compressor.js';
export { refine, extract, classify } from './refiner.js';
export { estimateTokens, initTokenizer, estimatorMode, imageTokens, resizeSavings } from './estimator.js';
export { decideInjection, attach, DIRECTIVES } from './injector.js';
export { deltaCompress } from './delta.js';
export { planImageDownscale, MEDIA_LIMITS, withinPdfLimits } from './media.js';
export { normalizePdfText, PDF_PAGE_TOKENS } from './pdftext.js';
export { createCalibration, observe, getParams } from './calibrator.js';
export { DISTILL_PROMPT } from './distiller.js';
export { refineWithLLM, REFINE_META_PROMPT } from './llm.js';
export { processPrompt } from './pipeline.js';
