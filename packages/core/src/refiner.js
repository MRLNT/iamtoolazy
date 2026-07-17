// PCTF refiner — restructures a raw prompt into
// Persona / Context / Task / Constraints / Format.
//
// Why structure when the goal is saving tokens? Because the biggest hidden
// token cost in real sessions is the retry: a vague prompt costs an extra
// round trip of 2,000–3,000 tokens. A few tokens of structure that prevent
// one retry pay for themselves many times over.
//
// Local and rule-based by default (free, private, instant). The optional
// LLM pass lives in llm.js and reuses the meta-prompt exported here.

import { detectLang } from './lang.js';

const MARKERS = {
  persona: {
    en: /(?:act as|you are|behave (?:like|as)|pretend to be|as an? )\s*([^,.;\n]+)/i,
    id: /(?:berperan sebagai|anggap (?:kamu|dirimu)(?: adalah)?|kamu adalah|sebagai seorang)\s*([^,.;\n]+)/i,
  },
  constraint: {
    en: /\b(?:don'?t\b|do not\b|never\b|avoid\b|without\b|no more than\b|at most\b|max(?:imum)?\b|must(?: not)?\b|only\b|exclude\b|limits?\b|under \d)/i,
    id: /\b(?:jangan\b|tidak boleh\b|tanpa\b|hindari\b|maksimal\b|minimal\b|hanya\b|harus\b|wajib\b|kecuali\b|batas)/i,
  },
  format: {
    en: /\b(?:table|bullet(?:s| points?)?|numbered list|lists?\b|json|yaml|csv|markdown|code\b(?: block)?|paragraphs?|steps?|outline|summary of|one[- ]liner|word(?:s)? (?:or (?:less|fewer)|max)|template)\b/i,
    id: /\b(?:tabel|poin(?:-poin)?|daftar|list|json|yaml|csv|markdown|paragraf|langkah(?:-langkah)?|ringkasan|kerangka|template|format)\b/i,
  },
  context: {
    en: /\b(?:i'?m|i am|i have|we(?:'re| are)?|my|our|currently|for my|context|background|working on|building)\b/i,
    id: /\b(?:saya sedang|saya punya|saya lagi|kami|konteks(?:nya)?|latar belakang|untuk (?:keperluan|proyek|tugas)|sedang (?:membangun|mengerjakan|membuat))\b/i,
  },
};

const TASK_VERBS = {
  en: /^\s*(?:write|create|make|build|generate|explain|describe|summarize|translate|fix|debug|refactor|review|analyze|compare|list|draft|design|implement|convert|optimi[sz]e|improve|rewrite|extract|classify|plan|outline|answer|find|calculate|suggest|recommend)\b/i,
  id: /^\s*(?:buat(?:kan)?|tulis(?:kan)?|jelaskan|deskripsikan|rangkum|ringkas|terjemahkan|perbaiki|benahi|refactor|review|analisis|bandingkan|daftar(?:kan)?|susun|rancang|implementasikan|ubah|konversi|optimalkan|tingkatkan|tulis ulang|ekstrak|klasifikasikan|rencanakan|jawab|cari|hitung|sarankan|rekomendasikan)\b/i,
};

const CODING_HINTS =
  /\b(?:code|function|bug|error|exception|stack ?trace|refactor|implement|api|endpoint|component|css|html|sql|query|regex|deploy|install|npm|pnpm|yarn|pip|script|compile|framework|library|database|schema|migration|kode|fungsi|galat|komponen|basis data|skrip)\b/i;

const WRITING_HINTS =
  /\b(?:essay|article|blog|story|email|letter|caption|copy(?:writing)?|script for|poem|esai|artikel|cerita|surat|naskah|puisi|konten)\b/i;

const ANALYSIS_HINTS =
  /\b(?:analy[sz]e|compare|evaluate|assess|pros and cons|trade-?offs?|analisis|bandingkan|evaluasi|kelebihan dan kekurangan|kaji)\b/i;

// Math/logic problems: Chain-of-Draft territory [Xu et al., arXiv:2502.18600]
const REASONING_HINTS =
  /\b(?:calculate|compute|solve|prove|probability|equation|derivative|integral|how (?:many|much)|hitung(?:lah)?|berapa banyak|persamaan|peluang|buktikan|logika)\b|\d\s*[+\-*/×÷^]\s*\d/i;

// Deliberately narrow: bare "short"/"quick" misfire on "short comments",
// "quick sort" — they describe the artifact, not the response length.
const BRIEF_HINTS = /\b(?:brief(?:ly)?|concise(?:ly)?|tl;?dr|one[- ]liner|in (?:a|one) sentence|singkat|ringkas|sekilas)\b/i;
const DETAIL_HINTS = /\b(?:detail(?:ed)?|in[- ]depth|comprehensive|thorough|complete|step[- ]by[- ]step|lengkap|mendalam|menyeluruh|rinci|detil)\b/i;

const LABELS = {
  en: { persona: 'You are', task: 'Task', context: 'Context', constraints: 'Constraints', format: 'Format' },
  id: { persona: 'Kamu adalah', task: 'Tugas', context: 'Konteks', constraints: 'Batasan', format: 'Format' },
};

function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extract PCTF parts from a raw prompt. Pure extraction — invents nothing.
 * @param {string} text
 * @param {'id'|'en'} [lang]
 */
export function extract(text, lang = detectLang(text)) {
  const parts = { persona: '', context: [], task: '', constraints: [], format: [] };
  let body = String(text).trim();

  const p = body.match(MARKERS.persona[lang]);
  if (p) {
    parts.persona = p[1].trim();
    body = body.replace(p[0], ' ').trim();
  }

  const sentences = splitSentences(body);
  const leftovers = [];

  for (const s of sentences) {
    if (!parts.task && TASK_VERBS[lang].test(s)) {
      parts.task = s;
    } else if (MARKERS.constraint[lang].test(s)) {
      parts.constraints.push(s);
    } else if (MARKERS.format[lang].test(s)) {
      parts.format.push(s);
    } else if (MARKERS.context[lang].test(s)) {
      parts.context.push(s);
    } else {
      leftovers.push(s);
    }
  }

  // No explicit task verb found: promote the first leftover (or the longest
  // sentence) to task so the model always gets a clear instruction first.
  if (!parts.task) {
    parts.task = leftovers.shift() || sentences[0] || body;
  }
  // Remaining unclassified sentences are treated as context.
  parts.context.push(...leftovers);

  return { parts, lang };
}

/**
 * Classify the prompt to predict response shape. Used by the adaptive
 * injector and by the CLI skill to decide when YAGNI mode should wake up.
 * @param {string} text
 * @returns {{type: 'coding'|'reasoning'|'writing'|'analysis'|'qa'|'other',
 *            expectedTokens: number, lang: 'id'|'en'}}
 */
export function classify(text) {
  const t = String(text);
  const lang = detectLang(t);
  const hasCode = /```|`[^`\n]+`/.test(t);

  let type = 'other';
  if (hasCode || CODING_HINTS.test(t)) type = 'coding';
  else if (REASONING_HINTS.test(t)) type = 'reasoning';
  else if (ANALYSIS_HINTS.test(t)) type = 'analysis';
  else if (WRITING_HINTS.test(t)) type = 'writing';
  else if (/^\s*(?:what|why|how|when|where|which|who|is|are|do|does|can|apa(?:kah)?|kenapa|mengapa|bagaimana|kapan|dimana|di mana|siapa|berapa)\b/i.test(t) || /\?\s*$/.test(t)) {
    type = 'qa';
  }

  const BASE = { coding: 700, reasoning: 400, analysis: 500, writing: 600, qa: 250, other: 350 };
  let expected = BASE[type];
  if (BRIEF_HINTS.test(t)) expected = Math.round(expected * 0.4);
  if (DETAIL_HINTS.test(t)) expected = Math.round(expected * 1.8);
  if (t.length < 40 && type === 'qa') expected = Math.min(expected, 120);
  // Greetings and bare one-liners ("halo", "hey there") land in 'other'
  // with no task signal; a directive can't pay for itself on them. Gate on
  // word count, not length, so a real short task ("reverse a linked list in
  // python") that also lands in 'other' keeps its normal estimate.
  const wordCount = t.trim().split(/\s+/).filter(Boolean).length;
  if (type === 'other' && wordCount <= 3) expected = Math.min(expected, 120);

  return { type, expectedTokens: expected, lang };
}

function buildStructured(parts, lang) {
  const L = LABELS[lang];
  const lines = [];
  if (parts.persona) lines.push(`${L.persona} ${parts.persona}.`);
  lines.push(`${L.task}: ${parts.task}`);
  if (parts.context.length) lines.push(`${L.context}: ${parts.context.join(' ')}`);
  if (parts.constraints.length) lines.push(`${L.constraints}: ${parts.constraints.join(' ')}`);
  if (parts.format.length) lines.push(`${L.format}: ${parts.format.join(' ')}`);
  return lines.join('\n');
}

function buildTight(parts) {
  const bits = [parts.task, ...parts.constraints, ...parts.format];
  if (parts.context.length) bits.push(...parts.context);
  return bits.join(' ');
}

/**
 * Refine a prompt.
 * mode 'auto' picks: structure when the prompt is complex enough to benefit
 * (≥3 sentences AND at least one of context/constraints/format found),
 * tighten (task-first reorder, no labels) otherwise, none for trivial prompts.
 * @param {string} text
 * @param {{mode?: 'auto'|'structure'|'tighten'}} [opts]
 */
export function refine(text, opts = {}) {
  const mode = opts.mode || 'auto';
  const original = String(text).trim();
  const { parts, lang } = extract(original);
  const sentenceCount = splitSentences(original).length;
  const signal = parts.context.length + parts.constraints.length + parts.format.length;

  let applied = mode;
  if (mode === 'auto') {
    if (sentenceCount >= 3 && signal >= 1) applied = 'structure';
    else if (sentenceCount >= 2) applied = 'tighten';
    else applied = 'none';
  }

  const refined =
    applied === 'structure' ? buildStructured(parts, lang)
    : applied === 'tighten' ? buildTight(parts)
    : original;

  return { refined, parts, applied, lang, original };
}
