// LAZY · Learn/Adapt — Self-Calibrating Injection (SCI).
//
// The static injector plans with universal constants (expected response
// length per task class, a conservative 0.35 savings factor). SCI replaces
// guesses with measurements: after each response, record the ACTUAL token
// count under the decision that was made. Over time the injection policy
// calibrates to this user's model and style — entirely on-device, zero
// telemetry, serializable as plain JSON.
//
// Honesty note: the true counterfactual ("what would this response have
// cost without the directive?") is unobservable per-turn. SCI approximates
// the savings factor from two populations (injected vs non-injected turns
// of the same class), which assumes rough comparability within a class.
// That assumption is stated, clamped, and scheduled for validation in the
// Fase 4 ablation study.

const DEFAULTS = { alpha: 0.3, minSamples: 3, clampFactor: [0.15, 0.6] };

/** Create empty calibration state (serialize with JSON.stringify). */
export function createCalibration(opts = {}) {
  return {
    version: 1,
    alpha: opts.alpha ?? DEFAULTS.alpha,
    minSamples: opts.minSamples ?? DEFAULTS.minSamples,
    classes: {}, // classType -> { injected: {n, ewma}, plain: {n, ewma} }
  };
}

function series() {
  return { n: 0, ewma: 0 };
}

function update(s, value, alpha) {
  s.n += 1;
  s.ewma = s.n === 1 ? value : (1 - alpha) * s.ewma + alpha * value;
}

/**
 * Record an observed response.
 * @param {object} state from createCalibration (mutated and returned)
 * @param {{classType: string, injected: boolean, actualTokens: number}} obs
 */
export function observe(state, obs) {
  if (!obs || !obs.classType || !(obs.actualTokens > 0)) return state;
  const c = (state.classes[obs.classType] ??= { injected: series(), plain: series() });
  update(obs.injected ? c.injected : c.plain, obs.actualTokens, state.alpha);
  return state;
}

/**
 * Calibrated parameters for a task class, or nulls when data is thin —
 * callers fall back to static defaults, so cold start behaves exactly
 * like the uncalibrated injector.
 * @param {object} state
 * @param {string} classType
 * @returns {{expectedTokens: number|null, savingsFactor: number|null,
 *            samples: {plain: number, injected: number}}}
 */
export function getParams(state, classType) {
  const c = state?.classes?.[classType];
  const samples = { plain: c?.plain.n ?? 0, injected: c?.injected.n ?? 0 };
  const enoughPlain = samples.plain >= (state?.minSamples ?? DEFAULTS.minSamples);
  const enoughBoth = enoughPlain && samples.injected >= (state?.minSamples ?? DEFAULTS.minSamples);

  const expectedTokens = enoughPlain ? Math.round(c.plain.ewma) : null;

  let savingsFactor = null;
  if (enoughBoth && c.plain.ewma > 0) {
    const raw = 1 - c.injected.ewma / c.plain.ewma;
    const [lo, hi] = DEFAULTS.clampFactor;
    savingsFactor = Math.min(hi, Math.max(lo, Number(raw.toFixed(3))));
  }
  return { expectedTokens, savingsFactor, samples };
}
