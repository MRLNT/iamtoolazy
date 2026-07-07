// Optional LLM refinement pass (hybrid mode).
//
// Local rules are the default: free, private, instant. When the user opts
// in with their own API key (BYOK), a small cheap model rewrites the prompt
// into PCTF far better than regexes can. Spending ~200 tokens on a cheap
// model to save a 2,000+ token retry on an expensive one is the trade.
//
// Nothing here runs unless the consumer explicitly calls it with a key.
// No key storage, no telemetry — the caller owns both.

export const REFINE_META_PROMPT = (userPrompt, lang) => `Rewrite the user's prompt into this exact structure, in the same language (${lang}). Extract only what is present or clearly implied — invent nothing. Omit lines with no content. Be terse. Return ONLY the rewritten prompt, no commentary, no markdown fences.

${lang === 'id' ? 'Kamu adalah <persona jika disebut>.\nTugas: ...\nKonteks: ...\nBatasan: ...\nFormat: ...' : 'You are <persona if stated>.\nTask: ...\nContext: ...\nConstraints: ...\nFormat: ...'}

User prompt:
<<<
${userPrompt}
>>>`;

const PROVIDERS = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-haiku-4-5',
    headers: (key) => ({
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    body: (model, prompt) => ({
      model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
    extract: (data) => data?.content?.find((b) => b.type === 'text')?.text ?? '',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    headers: (key) => ({
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    }),
    body: (model, prompt) => ({
      model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
    extract: (data) => data?.choices?.[0]?.message?.content ?? '',
  },
  gemini: {
    url: null, // built per-model below
    defaultModel: 'gemini-2.0-flash',
    headers: () => ({ 'content-type': 'application/json' }),
    body: (_model, prompt) => ({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500 },
    }),
    extract: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
  },
};

/**
 * Refine a prompt with the user's own model. Throws on network/auth errors;
 * callers should catch and fall back to the local refiner.
 * @param {string} prompt
 * @param {{provider: 'anthropic'|'openai'|'gemini', apiKey: string,
 *          model?: string, lang?: 'id'|'en',
 *          fetchImpl?: typeof fetch}} opts
 * @returns {Promise<string>} the rewritten prompt
 */
export async function refineWithLLM(prompt, opts) {
  const cfg = PROVIDERS[opts.provider];
  if (!cfg) throw new Error(`unknown provider: ${opts.provider}`);
  if (!opts.apiKey) throw new Error('apiKey required for LLM refinement');

  const model = opts.model || cfg.defaultModel;
  const meta = REFINE_META_PROMPT(prompt, opts.lang || 'en');
  const doFetch = opts.fetchImpl || fetch;

  const url =
    opts.provider === 'gemini'
      ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`
      : cfg.url;

  const res = await doFetch(url, {
    method: 'POST',
    headers: cfg.headers(opts.apiKey),
    body: JSON.stringify(cfg.body(model, meta)),
  });
  if (!res.ok) throw new Error(`${opts.provider} refine failed: HTTP ${res.status}`);

  const data = await res.json();
  const out = cfg.extract(data).trim();
  if (!out) throw new Error(`${opts.provider} refine returned empty output`);
  return out;
}
