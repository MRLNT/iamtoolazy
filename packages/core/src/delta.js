// LAZY · Zero-waste — Delta-Context Compression (DCC).
//
// In web chat the full history is re-sent every turn, yet users routinely
// restate context the model has already seen ("like I said, the app is…").
// DCC scores each sentence of the NEW prompt against the visible
// conversation and drops only what is already established.
//
// Safety rails (a sentence is NEVER dropped if any of these hold):
//  - it contains a protected span (code, URL, path, quote)
//  - it contains a negation (don't / not / jangan / tidak / tanpa / never)
//  - it looks like a task instruction (leading task verb)
//  - it contains a number the history has not seen
// Only then does redundancy coverage ≥ tau (default 0.85) drop it.

import { mask } from './protect.js';

const STOP = new Set([
  // en
  'the', 'a', 'an', 'and', 'or', 'is', 'are', 'was', 'were', 'to', 'of',
  'in', 'on', 'for', 'with', 'this', 'that', 'it', 'as', 'at', 'be', 'by',
  'my', 'our', 'your', 'i', 'we', 'you', 'am',
  // id
  'yang', 'dan', 'atau', 'di', 'ke', 'dari', 'untuk', 'dengan', 'ini',
  'itu', 'adalah', 'pada', 'saya', 'kamu', 'anda', 'kami', 'akan', 'sudah',
  'sedang', 'juga', 'saja',
]);

const NEGATION = /\b(?:don'?t|do not|not|never|no|jangan|tidak|bukan|tanpa)\b/i;
const TASKISH = /^\s*(?:write|create|make|build|generate|explain|summarize|fix|refactor|review|analyze|list|implement|buat(?:kan)?|tulis(?:kan)?|jelaskan|rangkum|perbaiki|analisis|daftar(?:kan)?|implementasikan)\b/i;

function contentWords(text) {
  const words = String(text).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [];
  return words.filter((w) => w.length >= 3 && !STOP.has(w));
}

function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Compress a new prompt against conversation history.
 * @param {string} prompt the user's new message
 * @param {string} history visible conversation so far (all prior turns)
 * @param {{tau?: number}} [opts] redundancy coverage threshold, default 0.85
 * @returns {{text: string, dropped: {text: string, coverage: number}[],
 *            savedChars: number, tau: number}}
 */
export function deltaCompress(prompt, history, opts = {}) {
  const tau = typeof opts.tau === 'number' ? opts.tau : 0.85;
  const original = String(prompt);
  if (!history || !String(history).trim()) {
    return { text: original, dropped: [], savedChars: 0, tau };
  }

  const seen = new Set(contentWords(history));
  const seenNumbers = new Set((String(history).match(/\d[\d.,]*/g) || []));

  const { masked } = mask(original); // masked view only for span detection
  const rawSentences = splitSentences(original);
  const maskedSentences = splitSentences(masked);

  const kept = [];
  const dropped = [];

  rawSentences.forEach((sentence, i) => {
    const maskedS = maskedSentences[i] ?? sentence;
    const hasProtected = /\u0000\d+\u0000/.test(maskedS);
    const words = contentWords(sentence);
    const numbers = sentence.match(/\d[\d.,]*/g) || [];
    const unseenNumber = numbers.some((n) => !seenNumbers.has(n));

    if (hasProtected || NEGATION.test(sentence) || TASKISH.test(sentence) || unseenNumber || words.length === 0) {
      kept.push(sentence);
      return;
    }

    const coverage = words.filter((w) => seen.has(w)).length / words.length;
    if (coverage >= tau) {
      dropped.push({ text: sentence, coverage: Number(coverage.toFixed(3)) });
    } else {
      kept.push(sentence);
    }
  });

  // Never empty the prompt.
  if (!kept.length) {
    return { text: original, dropped: [], savedChars: 0, tau };
  }

  const text = kept.join(' ');
  return { text, dropped, savedChars: Math.max(0, original.length - text.length), tau };
}
