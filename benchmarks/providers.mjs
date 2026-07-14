// Benchmark providers.
//
// `mock` is deterministic and network-free: it exists so the runner's
// plumbing (repeat runs, calibration wiring, probe protocol) is testable
// in a sandbox. Its outputs mean nothing about model quality.
//
// `anthropic` is BYOK via the ANTHROPIC_API_KEY environment variable.
// The key never appears in results files or logs.

import { estimateTokens } from '@iamtoolazy/core';

/** Tiny deterministic string hash (FNV-1a, 32-bit). */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function joinMessages(messages) {
  return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}

export function makeMockProvider() {
  return {
    name: 'mock',
    async complete(messages, { maxTokens = 1024 } = {}) {
      const joined = joinMessages(messages);
      const h = hash32(joined);
      // Output length varies deterministically with the input, so repeat
      // runs of identical requests are stable and different conditions
      // produce different (but meaningless) output sizes.
      const outputTokens = Math.min(maxTokens, 40 + (h % 160));
      const text = `[mock:${h.toString(16)}] deterministic sandbox output (${outputTokens} tok)`;
      return {
        text,
        inputTokens: estimateTokens(joined),
        outputTokens,
        latencyMs: 0,
      };
    },
  };
}

export function makeAnthropicProvider({ model }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set (BYOK — see benchmarks/README.md)');
  if (!model) throw new Error('--model is required for the anthropic provider');
  return {
    name: 'anthropic',
    async complete(messages, { maxTokens = 1024 } = {}) {
      const started = Date.now();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`anthropic API ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = await res.json();
      const text = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      return {
        text,
        inputTokens: data.usage?.input_tokens ?? null,
        outputTokens: data.usage?.output_tokens ?? null,
        latencyMs: Date.now() - started,
      };
    },
  };
}

export function makeProvider(name, opts = {}) {
  if (name === 'mock') return makeMockProvider();
  if (name === 'anthropic') return makeAnthropicProvider(opts);
  throw new Error(`unknown provider "${name}" (mock|anthropic)`);
}
