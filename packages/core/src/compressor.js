// Prompt compressor — caveman applied to the INPUT side.
//
// caveman compresses what the model says. iamtoolazy also compresses what
// YOU say, because in web chat your whole conversation history is re-sent
// as input on every turn: a token saved in the prompt is saved on every
// following turn of the thread.
//
// Guarantees:
//  - protected spans (code, URLs, paths, quotes) are byte-preserved
//  - negations are never in any removal pattern (meaning-safe by design)
//  - style is compressed, never translated
//
// Levels: lite (whitespace + openers/closers), full (+ fillers, default),
// ultra (+ EN articles, ID discourse particles).

import { mask, unmask } from './protect.js';
import { detectLang } from './lang.js';

const OPENERS = {
  en: [
    /^\s*(?:hi|hello|hey|good (?:morning|afternoon|evening))\b[!,. ]*/i,
    /^\s*(?:could|can|would|will) you (?:please |kindly )?/i,
    /^\s*(?:please|kindly)\s+/i,
    /^\s*i(?: would|'d) (?:like|love) (?:you )?to\s+/i,
    /^\s*i (?:want|need) you to\s+/i,
  ],
  id: [
    /^\s*(?:hai|halo|hi|selamat (?:pagi|siang|sore|malam))\b[!,. ]*/i,
    /^\s*(?:bisakah|bolehkah|dapatkah)\s+(?:kamu|anda)\s+(?:tolong\s+)?/i,
    /^\s*(?:bisa|boleh)\s+(?:tolong|minta|bantu)\s+/i,
    /^\s*(?:tolong|mohon|coba)\s+(?:bantu\s+)?/i,
    /^\s*saya (?:ingin|mau|minta) (?:kamu|anda)\s+(?:untuk\s+)?/i,
  ],
};

const FILLERS = {
  en: [
    /\b(?:please|kindly)\b ?/gi,
    /\b(?:just|really|actually|basically|simply|very)\b ?/gi,
    /\bi (?:think|guess|believe) (?:that )?/gi,
    /\b(?:kind|sort) of\b ?/gi,
    /\bif (?:possible|you can)\b,? ?/gi,
    /\bfor me\b ?/gi,
    /\bgo ahead and\b ?/gi,
  ],
  id: [
    /\b(?:tolong|mohon)\b ?/gi,
    /\b(?:kira-kira|sepertinya|kayaknya|mungkin bisa)\b ?/gi,
    /\bkalau (?:bisa|boleh)\b,? ?/gi,
    /\buntuk saya\b ?/gi,
    /\bsaya rasa\b ?/gi,
    /\bcoba\b ?/gi,
  ],
};

const CLOSERS = {
  en: [
    /\s*(?:thanks(?: in advance| so much| a lot)?|thank you(?: so much)?|cheers|ty)\W*$/i,
    /\s*i(?: would|'d)? ?appreciate (?:it|any help|your help)[^.!\n]*[.!]?\s*$/i,
    /\s*let me know if you (?:have any questions|need anything)[^.!\n]*[.!]?\s*$/i,
  ],
  id: [
    /\s*(?:terima kasih|makasih|thanks)(?: banyak| ya| sebelumnya)*\W*$/i,
    /\s*sebelumnya (?:terima kasih|makasih)[^.!\n]*[.!]?\s*$/i,
  ],
};

const ULTRA = {
  en: [/\b(?:the|a|an)\b ?/gi],
  id: [/\b(?:ya|deh|dong|sih|nih|kok|lho|loh|kan)\b ?/gi],
};

const LEVELS = ['lite', 'full', 'ultra'];

function applyRules(text, rules, type, removed) {
  let out = text;
  for (const re of rules) {
    out = out.replace(re, (m) => {
      if (m.trim()) removed.push({ type, text: m.trim() });
      return '';
    });
  }
  return out;
}

function tidyWhitespace(text) {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +([,.:;?!])/g, '$1')
    .replace(/([!?]){2,}/g, '$1')
    .replace(/\.{4,}/g, '...')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim();
}

/**
 * Compress a user prompt.
 * @param {string} text
 * @param {{level?: 'lite'|'full'|'ultra', lang?: 'id'|'en'|'auto'}} [opts]
 * @returns {{text: string, lang: 'id'|'en', level: string,
 *            removed: {type: string, text: string}[],
 *            savedChars: number}}
 */
export function compress(text, opts = {}) {
  const level = LEVELS.includes(opts.level) ? opts.level : 'full';
  const original = String(text);
  const lang = opts.lang && opts.lang !== 'auto' ? opts.lang : detectLang(original);
  const removed = [];

  const { masked, spans } = mask(original);
  let out = masked;

  // lite: openers + closers + whitespace
  out = applyRules(out, OPENERS[lang], 'opener', removed);
  out = applyRules(out, CLOSERS[lang], 'closer', removed);

  if (level === 'full' || level === 'ultra') {
    out = applyRules(out, FILLERS[lang], 'filler', removed);
  }
  if (level === 'ultra') {
    out = applyRules(out, ULTRA[lang], 'ultra', removed);
  }

  out = tidyWhitespace(out);
  out = unmask(out, spans);

  // Capitalize the sentence start we may have exposed by stripping an opener.
  out = out.replace(/^([a-z])/, (m) => m.toUpperCase());

  // Never return an empty prompt: if compression ate everything, keep original.
  if (!out.trim()) {
    return { text: original, lang, level, removed: [], savedChars: 0 };
  }

  return {
    text: out,
    lang,
    level,
    removed,
    savedChars: Math.max(0, original.length - out.length),
  };
}
