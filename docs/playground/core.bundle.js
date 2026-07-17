// GENERATED — do not edit. Rebuild: see docs/playground/README.md

// packages/core/src/lang.js
var ID_STOPWORDS = /* @__PURE__ */ new Set([
  "yang",
  "dan",
  "untuk",
  "dengan",
  "tidak",
  "saya",
  "kamu",
  "anda",
  "ini",
  "itu",
  "di",
  "ke",
  "dari",
  "akan",
  "bisa",
  "sudah",
  "belum",
  "juga",
  "atau",
  "pada",
  "dalam",
  "agar",
  "supaya",
  "karena",
  "kalau",
  "jika",
  "buat",
  "buatkan",
  "tolong",
  "mohon",
  "jangan",
  "harus",
  "saja",
  "lebih"
]);
var EN_STOPWORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "is",
  "are",
  "to",
  "of",
  "you",
  "that",
  "it",
  "for",
  "with",
  "this",
  "not",
  "have",
  "has",
  "will",
  "can",
  "could",
  "would",
  "should",
  "please",
  "make",
  "write",
  "do",
  "don\u2019t",
  "don't",
  "a",
  "an",
  "my",
  "me",
  "in",
  "on"
]);
function detectLang(text) {
  const words = String(text).toLowerCase().match(/[\p{L}'\u2019-]+/gu) || [];
  let id = 0;
  let en = 0;
  for (const w of words) {
    if (ID_STOPWORDS.has(w)) id++;
    if (EN_STOPWORDS.has(w)) en++;
  }
  return id > en ? "id" : "en";
}

// packages/core/src/protect.js
var PATTERNS = [
  /```[\s\S]*?```/g,
  // fenced code blocks
  /`[^`\n]+`/g,
  // inline code
  /https?:\/\/[^\s)\]>"']+/g,
  // URLs
  /\b[\w.-]+\.(?:js|mjs|cjs|ts|tsx|jsx|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|sql|sh|bash|zsh|yml|yaml|toml|json|md|txt|csv|html|css|scss|xml|env|lock|png|jpe?g|webp|svg|pdf)\b/gi,
  // file names
  /(?:\.{1,2})?\/[\w.-]+(?:\/[\w.-]+)+\/?/g,
  // unix-style paths
  /"[^"\n]+"/g,
  // double-quoted strings
  /(?<=^|[\s(,:=[])'[^'\n]+'(?=$|[\s),.:;\]?!])/gm
  // single-quoted (lookaround avoids contractions like don't)
];
function mask(text) {
  const spans = [];
  let masked = String(text);
  for (const re of PATTERNS) {
    masked = masked.replace(re, (m) => {
      const key = `\0${spans.length}\0`;
      spans.push(m);
      return key;
    });
  }
  return { masked, spans };
}
function unmask(masked, spans) {
  let out = String(masked);
  for (let pass = 0; pass <= spans.length; pass++) {
    const next = out.replace(/\u0000(\d+)\u0000/g, (m, i) => {
      const span = spans[Number(i)];
      return span === void 0 ? m : span;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

// packages/core/src/compressor.js
var OPENERS = {
  en: [
    /^\s*(?:hi|hello|hey|good (?:morning|afternoon|evening))\b[!,. ]*/i,
    /^\s*(?:could|can|would|will) you (?:please |kindly )?/i,
    /^\s*(?:please|kindly)\s+/i,
    /^\s*i(?: would|'d) (?:like|love) (?:you )?to\s+/i,
    /^\s*i (?:want|need) you to\s+/i
  ],
  id: [
    /^\s*(?:hai|halo|hi|selamat (?:pagi|siang|sore|malam))\b[!,. ]*/i,
    /^\s*(?:bisakah|bolehkah|dapatkah)\s+(?:kamu|anda)\s+(?:tolong\s+)?/i,
    /^\s*(?:bisa|boleh)\s+(?:tolong|minta|bantu)\s+/i,
    /^\s*(?:tolong|mohon|coba)\s+(?:bantu\s+)?/i,
    /^\s*saya (?:ingin|mau|minta) (?:kamu|anda)\s+(?:untuk\s+)?/i
  ]
};
var FILLERS = {
  en: [
    /\b(?:please|kindly)\b ?/gi,
    /\b(?:just|really|actually|basically|simply|very)\b ?/gi,
    /\bi (?:think|guess|believe) (?:that )?/gi,
    /\b(?:kind|sort) of\b ?/gi,
    /\bif (?:possible|you can)\b,? ?/gi,
    /\bfor me\b ?/gi,
    /\bgo ahead and\b ?/gi
  ],
  id: [
    /\b(?:tolong|mohon)\b ?/gi,
    /\b(?:kira-kira|sepertinya|kayaknya|mungkin bisa)\b ?/gi,
    /\bkalau (?:bisa|boleh)\b,? ?/gi,
    /\buntuk saya\b ?/gi,
    /\bsaya rasa\b ?/gi,
    /\bcoba\b ?/gi
  ]
};
var CLOSERS = {
  en: [
    /\s*(?:thanks|thank you|cheers|ty)(?: so much| a lot| in advance| very much)*\W*$/i,
    /\s*i(?: would|'d)? ?appreciate (?:it|any help|your help)[^.!\n]*[.!]?\s*$/i,
    /\s*let me know if you (?:have any questions|need anything)[^.!\n]*[.!]?\s*$/i
  ],
  id: [
    /\s*(?:terima kasih|makasih|thanks)(?: banyak| ya| sebelumnya)*\W*$/i,
    /\s*sebelumnya (?:terima kasih|makasih)[^.!\n]*[.!]?\s*$/i
  ]
};
var ULTRA = {
  en: [/\b(?:the|a|an)\b ?/gi],
  id: [/\b(?:ya|deh|dong|sih|nih|kok|lho|loh|kan)\b ?/gi]
};
var LEVELS = ["lite", "full", "ultra"];
function applyRules(text, rules, type, removed) {
  let out = text;
  for (const re of rules) {
    out = out.replace(re, (m) => {
      if (m.trim()) removed.push({ type, text: m.trim() });
      return "";
    });
  }
  return out;
}
function tidyWhitespace(text) {
  return text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").replace(/ +([,.:;?!])/g, "$1").replace(/([!?]){2,}/g, "$1").replace(/\.{4,}/g, "...").replace(/^[ \t]+|[ \t]+$/gm, "").trim();
}
function compress(text, opts = {}) {
  const level = LEVELS.includes(opts.level) ? opts.level : "full";
  const original = String(text);
  const lang = opts.lang && opts.lang !== "auto" ? opts.lang : detectLang(original);
  const removed = [];
  const { masked, spans } = mask(original);
  let out = masked;
  out = applyRules(out, OPENERS[lang], "opener", removed);
  out = applyRules(out, CLOSERS[lang], "closer", removed);
  if (level === "full" || level === "ultra") {
    out = applyRules(out, FILLERS[lang], "filler", removed);
  }
  if (level === "ultra") {
    out = applyRules(out, ULTRA[lang], "ultra", removed);
  }
  out = tidyWhitespace(out);
  out = unmask(out, spans);
  out = out.replace(/^([a-z])/, (m) => m.toUpperCase());
  if (!out.trim()) {
    return { text: original, lang, level, removed: [], savedChars: 0 };
  }
  return {
    text: out,
    lang,
    level,
    removed,
    savedChars: Math.max(0, original.length - out.length)
  };
}

// packages/core/src/refiner.js
var MARKERS = {
  persona: {
    en: /(?:act as|you are|behave (?:like|as)|pretend to be|as an? )\s*([^,.;\n]+)/i,
    id: /(?:berperan sebagai|anggap (?:kamu|dirimu)(?: adalah)?|kamu adalah|sebagai seorang)\s*([^,.;\n]+)/i
  },
  constraint: {
    en: /\b(?:don'?t\b|do not\b|never\b|avoid\b|without\b|no more than\b|at most\b|max(?:imum)?\b|must(?: not)?\b|only\b|exclude\b|limits?\b|under \d)/i,
    id: /\b(?:jangan\b|tidak boleh\b|tanpa\b|hindari\b|maksimal\b|minimal\b|hanya\b|harus\b|wajib\b|kecuali\b|batas)/i
  },
  format: {
    en: /\b(?:table|bullet(?:s| points?)?|numbered list|lists?\b|json|yaml|csv|markdown|code\b(?: block)?|paragraphs?|steps?|outline|summary of|one[- ]liner|word(?:s)? (?:or (?:less|fewer)|max)|template)\b/i,
    id: /\b(?:tabel|poin(?:-poin)?|daftar|list|json|yaml|csv|markdown|paragraf|langkah(?:-langkah)?|ringkasan|kerangka|template|format)\b/i
  },
  context: {
    en: /\b(?:i'?m|i am|i have|we(?:'re| are)?|my|our|currently|for my|context|background|working on|building)\b/i,
    id: /\b(?:saya sedang|saya punya|saya lagi|kami|konteks(?:nya)?|latar belakang|untuk (?:keperluan|proyek|tugas)|sedang (?:membangun|mengerjakan|membuat))\b/i
  }
};
var TASK_VERBS = {
  en: /^\s*(?:write|create|make|build|generate|explain|describe|summarize|translate|fix|debug|refactor|review|analyze|compare|list|draft|design|implement|convert|optimi[sz]e|improve|rewrite|extract|classify|plan|outline|answer|find|calculate|suggest|recommend)\b/i,
  id: /^\s*(?:buat(?:kan)?|tulis(?:kan)?|jelaskan|deskripsikan|rangkum|ringkas|terjemahkan|perbaiki|benahi|refactor|review|analisis|bandingkan|daftar(?:kan)?|susun|rancang|implementasikan|ubah|konversi|optimalkan|tingkatkan|tulis ulang|ekstrak|klasifikasikan|rencanakan|jawab|cari|hitung|sarankan|rekomendasikan)\b/i
};
var CODING_HINTS = /\b(?:code|function|bug|error|exception|stack ?trace|refactor|implement|api|endpoint|component|css|html|sql|query|regex|deploy|install|npm|pnpm|yarn|pip|script|compile|framework|library|database|schema|migration|kode|fungsi|galat|komponen|basis data|skrip)\b/i;
var WRITING_HINTS = /\b(?:essay|article|blog|story|email|letter|caption|copy(?:writing)?|script for|poem|esai|artikel|cerita|surat|naskah|puisi|konten)\b/i;
var ANALYSIS_HINTS = /\b(?:analy[sz]e|compare|evaluate|assess|pros and cons|trade-?offs?|analisis|bandingkan|evaluasi|kelebihan dan kekurangan|kaji)\b/i;
var REASONING_HINTS = /\b(?:calculate|compute|solve|prove|probability|equation|derivative|integral|how (?:many|much)|hitung(?:lah)?|berapa banyak|persamaan|peluang|buktikan|logika)\b|\d\s*[+\-*/×÷^]\s*\d/i;
var BRIEF_HINTS = /\b(?:brief(?:ly)?|concise(?:ly)?|tl;?dr|one[- ]liner|in (?:a|one) sentence|singkat|ringkas|sekilas)\b/i;
var DETAIL_HINTS = /\b(?:detail(?:ed)?|in[- ]depth|comprehensive|thorough|complete|step[- ]by[- ]step|lengkap|mendalam|menyeluruh|rinci|detil)\b/i;
var LABELS = {
  en: { persona: "You are", task: "Task", context: "Context", constraints: "Constraints", format: "Format" },
  id: { persona: "Kamu adalah", task: "Tugas", context: "Konteks", constraints: "Batasan", format: "Format" }
};
function splitSentences(text) {
  return String(text).split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}
function extract(text, lang = detectLang(text)) {
  const parts = { persona: "", context: [], task: "", constraints: [], format: [] };
  let body = String(text).trim();
  const p = body.match(MARKERS.persona[lang]);
  if (p) {
    parts.persona = p[1].trim();
    body = body.replace(p[0], " ").trim();
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
  if (!parts.task) {
    parts.task = leftovers.shift() || sentences[0] || body;
  }
  parts.context.push(...leftovers);
  return { parts, lang };
}
function classify(text) {
  const t = String(text);
  const lang = detectLang(t);
  const hasCode = /```|`[^`\n]+`/.test(t);
  let type = "other";
  if (hasCode || CODING_HINTS.test(t)) type = "coding";
  else if (REASONING_HINTS.test(t)) type = "reasoning";
  else if (ANALYSIS_HINTS.test(t)) type = "analysis";
  else if (WRITING_HINTS.test(t)) type = "writing";
  else if (/^\s*(?:what|why|how|when|where|which|who|is|are|do|does|can|apa(?:kah)?|kenapa|mengapa|bagaimana|kapan|dimana|di mana|siapa|berapa)\b/i.test(t) || /\?\s*$/.test(t)) {
    type = "qa";
  }
  const BASE = { coding: 700, reasoning: 400, analysis: 500, writing: 600, qa: 250, other: 350 };
  let expected = BASE[type];
  if (BRIEF_HINTS.test(t)) expected = Math.round(expected * 0.4);
  if (DETAIL_HINTS.test(t)) expected = Math.round(expected * 1.8);
  if (t.length < 40 && type === "qa") expected = Math.min(expected, 120);
  const wordCount = t.trim().split(/\s+/).filter(Boolean).length;
  if (type === "other" && wordCount <= 3) expected = Math.min(expected, 120);
  return { type, expectedTokens: expected, lang };
}
function buildStructured(parts, lang) {
  const L = LABELS[lang];
  const lines = [];
  if (parts.persona) lines.push(`${L.persona} ${parts.persona}.`);
  lines.push(`${L.task}: ${parts.task}`);
  if (parts.context.length) lines.push(`${L.context}: ${parts.context.join(" ")}`);
  if (parts.constraints.length) lines.push(`${L.constraints}: ${parts.constraints.join(" ")}`);
  if (parts.format.length) lines.push(`${L.format}: ${parts.format.join(" ")}`);
  return lines.join("\n");
}
function buildTight(parts) {
  const bits = [parts.task, ...parts.constraints, ...parts.format];
  if (parts.context.length) bits.push(...parts.context);
  return bits.join(" ");
}
function refine(text, opts = {}) {
  const mode = opts.mode || "auto";
  const original = String(text).trim();
  const { parts, lang } = extract(original);
  const sentenceCount = splitSentences(original).length;
  const signal = parts.context.length + parts.constraints.length + parts.format.length;
  let applied = mode;
  if (mode === "auto") {
    if (sentenceCount >= 3 && signal >= 1) applied = "structure";
    else if (sentenceCount >= 2) applied = "tighten";
    else applied = "none";
  }
  const refined = applied === "structure" ? buildStructured(parts, lang) : applied === "tighten" ? buildTight(parts) : original;
  return { refined, parts, applied, lang, original };
}

// packages/core/src/estimator.js
var countFn = null;
var initStarted = false;
async function initTokenizer() {
  if (initStarted) return !!countFn;
  initStarted = true;
  try {
    const mod = await import("gpt-tokenizer/encoding/o200k_base");
    countFn = mod.countTokens;
  } catch {
    countFn = null;
  }
  return !!countFn;
}
var CLAUDE_FACTOR = 1.15;
function heuristic(text) {
  return Math.max(1, Math.ceil(String(text).length / 4));
}
function estimateTokens(text, opts = {}) {
  const base = countFn ? countFn(String(text)) : heuristic(text);
  return opts.provider === "claude" ? Math.ceil(base * CLAUDE_FACTOR) : base;
}
function estimatorMode() {
  return countFn ? "tokenizer" : "heuristic";
}
function imageTokens(width, height, opts = {}) {
  const provider = opts.provider || "claude";
  let w = Math.max(1, Math.round(width));
  let h = Math.max(1, Math.round(height));
  if (provider === "claude") {
    return Math.min(1600, Math.ceil(w * h / 750));
  }
  if (provider === "gemini") {
    if (w <= 384 && h <= 384) return 258;
    const fit = 3072 / Math.max(w, h);
    if (fit < 1) {
      w = Math.round(w * fit);
      h = Math.round(h * fit);
    }
    return Math.ceil(w / 768) * Math.ceil(h / 768) * 258;
  }
  if (opts.detail === "low") return 85;
  const fitLong = 2048 / Math.max(w, h);
  if (fitLong < 1) {
    w = Math.round(w * fitLong);
    h = Math.round(h * fitLong);
  }
  const fitShort = 768 / Math.min(w, h);
  if (fitShort < 1) {
    w = Math.round(w * fitShort);
    h = Math.round(h * fitShort);
  }
  const tiles = Math.ceil(w / 512) * Math.ceil(h / 512);
  return 85 + 170 * tiles;
}
function resizeSavings(width, height, maxSide, opts = {}) {
  const before = imageTokens(width, height, opts);
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const after = imageTokens(Math.round(width * scale), Math.round(height * scale), opts);
  return { before, after, saved: Math.max(0, before - after), scale };
}

// packages/core/src/calibrator.js
var DEFAULTS = { alpha: 0.3, minSamples: 3, clampFactor: [0.15, 0.6] };
function createCalibration(opts = {}) {
  return {
    version: 1,
    alpha: opts.alpha ?? DEFAULTS.alpha,
    minSamples: opts.minSamples ?? DEFAULTS.minSamples,
    classes: {}
    // classType -> { injected: {n, ewma}, plain: {n, ewma} }
  };
}
function series() {
  return { n: 0, ewma: 0 };
}
function update(s, value, alpha) {
  s.n += 1;
  s.ewma = s.n === 1 ? value : (1 - alpha) * s.ewma + alpha * value;
}
function observe(state, obs) {
  if (!obs || !obs.classType || !(obs.actualTokens > 0)) return state;
  const c = state.classes[obs.classType] ??= { injected: series(), plain: series() };
  update(obs.injected ? c.injected : c.plain, obs.actualTokens, state.alpha);
  return state;
}
function getParams(state, classType) {
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

// packages/core/src/injector.js
var DIRECTIVES = {
  terse: {
    en: "Reply ultra-terse: no preamble, no recap, no closing offers. Fragments OK. Keep code, commands, URLs, numbers exact.",
    id: "Jawab super ringkas: tanpa pembuka, tanpa rangkuman ulang, tanpa tawaran penutup. Fragmen boleh. Kode, perintah, URL, angka harus persis."
  },
  cod: {
    en: 'Reason as a numbered draft, each step \u22645 words; give the final answer after "####".',
    id: 'Bernalar sebagai draf bernomor, tiap langkah \u22645 kata; jawaban akhir setelah "####".'
  },
  yagni: {
    en: "Code: simplest working solution. Prefer delete > reuse > stdlib > platform-native > new code. No unrequested abstractions or dependencies. Mark deliberate shortcuts with a `lazy:` comment naming the upgrade path.",
    id: "Kode: solusi paling sederhana yang jalan. Urutan: hapus > pakai ulang > stdlib > fitur bawaan platform > kode baru. Tanpa abstraksi/dependensi yang tidak diminta. Tandai shortcut sengaja dengan komentar `lazy:` berisi jalur upgrade-nya."
  }
};
var SAVINGS_FACTOR = 0.35;
var BUDGET_FLOOR = 120;
function decideInjection(prompt, opts = {}) {
  const {
    minExpectedTokens = 150,
    margin = 1.5,
    enableTerse = true,
    enableYagni = true,
    enableCoD = true,
    enableBudget = true,
    provider = "generic"
  } = opts;
  const classification = classify(prompt);
  const lang = opts.lang || classification.lang;
  const cls = classification.type;
  let expected = classification.expectedTokens;
  let factor = SAVINGS_FACTOR;
  let calibrated = false;
  if (opts.calibration) {
    const p = getParams(opts.calibration, cls);
    if (p.expectedTokens != null) {
      expected = p.expectedTokens;
      calibrated = true;
    }
    if (p.savingsFactor != null) {
      factor = p.savingsFactor;
      calibrated = true;
    }
  }
  if (typeof opts.expectedTokens === "number") expected = opts.expectedTokens;
  if (typeof opts.savingsFactor === "number") factor = opts.savingsFactor;
  const pieces = [];
  if (enableCoD && cls === "reasoning") pieces.push(DIRECTIVES.cod[lang]);
  else if (enableTerse && cls !== "writing") pieces.push(DIRECTIVES.terse[lang]);
  if (enableYagni && cls === "coding") pieces.push(DIRECTIVES.yagni[lang]);
  let budgetTokens = null;
  if (enableBudget) {
    const keep = Math.max(0.5, 1 - factor);
    budgetTokens = Math.max(BUDGET_FLOOR, Math.round(expected * keep));
    pieces.push(lang === "id" ? `Jawab dalam \u2264${budgetTokens} token.` : `Answer in \u2264${budgetTokens} tokens.`);
  }
  if (!pieces.length) {
    return { inject: false, directive: "", overheadTokens: 0, expectedSavings: 0, budgetTokens: null, classification, calibrated, reason: "no directives enabled" };
  }
  const directive = pieces.join("\n");
  const overheadTokens = estimateTokens(directive, { provider });
  const expectedSavings = Math.round(expected * factor);
  if (expected < minExpectedTokens) {
    return { inject: false, directive: "", overheadTokens, expectedSavings: 0, budgetTokens: null, classification, calibrated, reason: `expected response ~${expected} tok < ${minExpectedTokens} floor \u2014 injecting would cost more than it saves` };
  }
  if (expectedSavings <= overheadTokens * margin) {
    return { inject: false, directive: "", overheadTokens, expectedSavings: 0, budgetTokens: null, classification, calibrated, reason: `predicted savings ${expectedSavings} tok \u2264 overhead ${overheadTokens} \xD7 ${margin}` };
  }
  return { inject: true, directive, overheadTokens, expectedSavings, budgetTokens, classification, calibrated, reason: `predicted savings ${expectedSavings} tok > overhead ${overheadTokens} \xD7 ${margin}` };
}
function attach(prompt, directive) {
  return directive ? `${prompt}

[${directive}]` : prompt;
}

// packages/core/src/delta.js
var STOP = /* @__PURE__ */ new Set([
  // en
  "the",
  "a",
  "an",
  "and",
  "or",
  "is",
  "are",
  "was",
  "were",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "this",
  "that",
  "it",
  "as",
  "at",
  "be",
  "by",
  "my",
  "our",
  "your",
  "i",
  "we",
  "you",
  "am",
  // id
  "yang",
  "dan",
  "atau",
  "di",
  "ke",
  "dari",
  "untuk",
  "dengan",
  "ini",
  "itu",
  "adalah",
  "pada",
  "saya",
  "kamu",
  "anda",
  "kami",
  "akan",
  "sudah",
  "sedang",
  "juga",
  "saja"
]);
var NEGATION = /\b(?:don'?t|do not|not|never|no|jangan|tidak|bukan|tanpa)\b/i;
var TASKISH = /^\s*(?:write|create|make|build|generate|explain|summarize|fix|refactor|review|analyze|list|implement|buat(?:kan)?|tulis(?:kan)?|jelaskan|rangkum|perbaiki|analisis|daftar(?:kan)?|implementasikan)\b/i;
function contentWords(text) {
  const words = String(text).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [];
  return words.filter((w) => w.length >= 3 && !STOP.has(w));
}
function splitSentences2(text) {
  return String(text).split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}
function deltaCompress(prompt, history, opts = {}) {
  const tau = typeof opts.tau === "number" ? opts.tau : 0.85;
  const original = String(prompt);
  if (!history || !String(history).trim()) {
    return { text: original, dropped: [], savedChars: 0, tau };
  }
  const seen = new Set(contentWords(history));
  const seenNumbers = new Set(String(history).match(/\d[\d.,]*/g) || []);
  const { masked } = mask(original);
  const rawSentences = splitSentences2(original);
  const maskedSentences = splitSentences2(masked);
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
  if (!kept.length) {
    return { text: original, dropped: [], savedChars: 0, tau };
  }
  const text = kept.join(" ");
  return { text, dropped, savedChars: Math.max(0, original.length - text.length), tau };
}

// packages/core/src/media.js
function planImageDownscale(images, opts = {}) {
  const provider = opts.provider || "claude";
  const maxSide = opts.maxSide || (provider === "gemini" ? 768 : 1092);
  const minSaved = typeof opts.minSaved === "number" ? opts.minSaved : 50;
  const items = (images || []).map((img) => {
    const width = Math.max(1, Math.round(img.width));
    const height = Math.max(1, Math.round(img.height));
    const { before, after, saved, scale } = resizeSavings(width, height, maxSide, { provider });
    return {
      name: img.name || "image",
      width,
      height,
      targetWidth: Math.max(1, Math.round(width * scale)),
      targetHeight: Math.max(1, Math.round(height * scale)),
      before,
      after,
      saved,
      scale,
      shrink: scale < 1 && saved > 0
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
    shouldOffer: items.some((i) => i.shrink) && totalSaved >= minSaved
  };
}
var MEDIA_LIMITS = {
  imageMaxMB: 40,
  // beyond this we skip local decode (createImageBitmap cost)
  pdfMaxMB: 25,
  // beyond this we skip local extraction
  pdfMaxPages: 300
  // beyond this we skip local extraction
};
function withinPdfLimits(info = {}) {
  const mb = (info.sizeBytes || 0) / (1024 * 1024);
  if (mb > MEDIA_LIMITS.pdfMaxMB) {
    return { ok: false, reason: `larger than ${MEDIA_LIMITS.pdfMaxMB} MB` };
  }
  if (typeof info.numPages === "number" && info.numPages > MEDIA_LIMITS.pdfMaxPages) {
    return { ok: false, reason: `more than ${MEDIA_LIMITS.pdfMaxPages} pages` };
  }
  return { ok: true, reason: null };
}

// packages/core/src/pdftext.js
var PDF_PAGE_TOKENS = 1500;
function normalizePdfText(pages, opts = {}) {
  const cleaned = (pages || []).map(
    (p) => String(p || "").replace(/[ \t]+/g, " ").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  );
  const emptyPages = cleaned.filter((p) => !p).length;
  const parts = [];
  cleaned.forEach((p, i) => {
    if (p) parts.push(`--- page ${i + 1} ---
${p}`);
  });
  const header = `[PDF: ${opts.name || "document"} \xB7 ${cleaned.length} page${cleaned.length === 1 ? "" : "s"}, extracted locally]`;
  const text = parts.length ? `${header}
${parts.join("\n\n")}` : "";
  return { text, pageCount: cleaned.length, emptyPages };
}

// packages/core/src/distiller.js
var DISTILL_PROMPT = {
  en: (maxTokens = 400) => `Distill this entire conversation into a compact brief (max ~${maxTokens} tokens) I can paste into a new thread to continue seamlessly. Include only: goal, key decisions with one-line reasons, current state, open items, and any code/identifiers/URLs that must survive verbatim. No narrative recap, no politeness.`,
  id: (maxTokens = 400) => `Rangkum seluruh percakapan ini jadi brief padat (maks ~${maxTokens} token) yang bisa saya tempel di thread baru untuk lanjut mulus. Isi hanya: tujuan, keputusan penting dengan alasan satu baris, kondisi terkini, hal yang masih terbuka, dan kode/identifier/URL yang harus persis. Tanpa cerita ulang, tanpa basa-basi.`
};

// packages/core/src/llm.js
var REFINE_META_PROMPT = (userPrompt, lang) => `Rewrite the user's prompt into this exact structure, in the same language (${lang}). Extract only what is present or clearly implied \u2014 invent nothing. Omit lines with no content. Be terse. Return ONLY the rewritten prompt, no commentary, no markdown fences.

${lang === "id" ? "Kamu adalah <persona jika disebut>.\nTugas: ...\nKonteks: ...\nBatasan: ...\nFormat: ..." : "You are <persona if stated>.\nTask: ...\nContext: ...\nConstraints: ...\nFormat: ..."}

User prompt:
<<<
${userPrompt}
>>>`;
var PROVIDERS = {
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-haiku-4-5",
    headers: (key) => ({
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    }),
    body: (model, prompt) => ({
      model,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    }),
    extract: (data) => data?.content?.find((b) => b.type === "text")?.text ?? ""
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    headers: (key) => ({
      "content-type": "application/json",
      authorization: `Bearer ${key}`
    }),
    body: (model, prompt) => ({
      model,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    }),
    extract: (data) => data?.choices?.[0]?.message?.content ?? ""
  },
  gemini: {
    url: null,
    // built per-model below
    defaultModel: "gemini-2.0-flash",
    headers: () => ({ "content-type": "application/json" }),
    body: (_model, prompt) => ({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500 }
    }),
    extract: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  }
};
async function refineWithLLM(prompt, opts) {
  const cfg = PROVIDERS[opts.provider];
  if (!cfg) throw new Error(`unknown provider: ${opts.provider}`);
  if (!opts.apiKey) throw new Error("apiKey required for LLM refinement");
  const model = opts.model || cfg.defaultModel;
  const meta = REFINE_META_PROMPT(prompt, opts.lang || "en");
  const doFetch = opts.fetchImpl || fetch;
  const url = opts.provider === "gemini" ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}` : cfg.url;
  const res = await doFetch(url, {
    method: "POST",
    headers: cfg.headers(opts.apiKey),
    body: JSON.stringify(cfg.body(model, meta))
  });
  if (!res.ok) throw new Error(`${opts.provider} refine failed: HTTP ${res.status}`);
  const data = await res.json();
  const out = cfg.extract(data).trim();
  if (!out) throw new Error(`${opts.provider} refine returned empty output`);
  return out;
}

// packages/core/src/pipeline.js
function processPrompt(rawPrompt, opts = {}) {
  const {
    refine: doRefine = true,
    refineMode = "auto",
    compress: doCompress = true,
    compressLevel = "full",
    inject: doInject = true,
    enableYagni = true,
    provider = "generic",
    history = "",
    calibration = null
  } = opts;
  const stages = [];
  let text = String(rawPrompt);
  let deltaResult = null;
  if (history) {
    deltaResult = deltaCompress(text, history);
    text = deltaResult.text;
    if (deltaResult.dropped.length) {
      stages.push({ stage: "delta", dropped: deltaResult.dropped.length });
    }
  }
  let compressResult = null;
  if (doCompress) {
    compressResult = compress(text, { level: compressLevel });
    text = compressResult.text;
    if (compressResult.removed.length) {
      stages.push({ stage: "compress", removed: compressResult.removed.length });
    }
  }
  let refineResult = null;
  if (doRefine) {
    refineResult = refine(text, { mode: refineMode });
    if (refineResult.applied !== "none") {
      text = refineResult.refined;
      stages.push({ stage: "refine", applied: refineResult.applied });
    }
  }
  let injection = null;
  if (doInject) {
    injection = decideInjection(text, { enableYagni, provider, calibration });
    if (injection.inject) {
      text = attach(text, injection.directive);
      stages.push({ stage: "inject", expectedSavings: injection.expectedSavings });
    }
  }
  const tokensBefore = estimateTokens(rawPrompt, { provider });
  const tokensAfter = estimateTokens(text, { provider });
  return {
    input: String(rawPrompt),
    output: text,
    stages,
    delta: deltaResult,
    refine: refineResult,
    compress: compressResult,
    injection,
    tokens: {
      before: tokensBefore,
      after: tokensAfter,
      // Input delta can be positive (structure/directive added). The honest
      // ledger nets it against predicted output savings — never hide it.
      inputDelta: tokensAfter - tokensBefore,
      predictedOutputSavings: injection?.inject ? injection.expectedSavings : 0,
      predictedNet: (injection?.inject ? injection.expectedSavings : 0) - (tokensAfter - tokensBefore),
      estimateNote: "estimates \u2014 see docs/honest-numbers.md"
    }
  };
}
export {
  DIRECTIVES,
  DISTILL_PROMPT,
  MEDIA_LIMITS,
  PDF_PAGE_TOKENS,
  REFINE_META_PROMPT,
  attach,
  classify,
  compress,
  createCalibration,
  decideInjection,
  deltaCompress,
  detectLang,
  estimateTokens,
  estimatorMode,
  extract,
  getParams,
  imageTokens,
  initTokenizer,
  mask,
  normalizePdfText,
  observe,
  planImageDownscale,
  processPrompt,
  refine,
  refineWithLLM,
  resizeSavings,
  unmask,
  withinPdfLimits
};
