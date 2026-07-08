#!/usr/bin/env node
// iamtoolazy — UserPromptSubmit hook (self-contained; plugins are cached
// in isolation, so no imports from ../../core).
//
// Reads the prompt from stdin, classifies it, and — ONLY when predicted
// savings beat the overhead — emits additionalContext phrased as factual
// user-preference statements (imperative "system-style" text can trip
// Claude's prompt-injection defenses). Every decision is appended to the
// local ledger. Fails open: any error → exit 0, prompt untouched.

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.iamtoolazy');
const CONFIG = join(DIR, 'config.json');
const CALIB = join(DIR, 'calibration.json');
const LEDGER = join(DIR, 'stats.jsonl');

const tok = (s) => Math.max(1, Math.ceil(String(s).length / 4)); // rough, documented estimate

function classify(t) {
  const hasCode = /```|`[^`\n]+`/.test(t);
  const REASON = /\b(?:calculate|compute|solve|prove|probability|equation|how (?:many|much)|hitung(?:lah)?|berapa banyak|persamaan|peluang|buktikan)\b|\d\s*[+\-*/×÷^]\s*\d/i;
  const CODE = /\b(?:code|function|bug|error|refactor|implement|api|endpoint|component|css|sql|regex|deploy|npm|script|schema|migration|kode|fungsi|galat|komponen)\b/i;
  const WRITE = /\b(?:essay|article|blog|story|email|letter|poem|esai|artikel|cerita|surat|puisi|konten)\b/i;
  const ANALYSIS = /\b(?:analy[sz]e|compare|evaluate|pros and cons|analisis|bandingkan|evaluasi|kaji)\b/i;
  let type = 'other';
  if (hasCode) type = 'coding';
  else if (REASON.test(t)) type = 'reasoning';
  else if (CODE.test(t)) type = 'coding';
  else if (ANALYSIS.test(t)) type = 'analysis';
  else if (WRITE.test(t)) type = 'writing';
  else if (/^\s*(?:what|why|how|when|which|who|is|are|do|does|can|apa|kenapa|mengapa|bagaimana|kapan|siapa|berapa)\b/i.test(t) || /\?\s*$/.test(t)) type = 'qa';
  const BASE = { coding: 700, reasoning: 400, analysis: 500, writing: 600, qa: 250, other: 350 };
  let expected = BASE[type];
  if (/\b(?:brief(?:ly)?|concise(?:ly)?|tl;?dr|singkat|ringkas)\b/i.test(t)) expected = Math.round(expected * 0.4);
  if (/\b(?:detail(?:ed)?|in[- ]depth|comprehensive|step[- ]by[- ]step|lengkap|mendalam|rinci)\b/i.test(t)) expected = Math.round(expected * 1.8);
  if (t.length < 40 && type === 'qa') expected = Math.min(expected, 120);
  return { type, expected };
}

function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

function main() {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw || '{}');
  const prompt = String(input.prompt || '');
  if (!prompt.trim()) return;
  // Slash commands (/lazy:stats, /plugin, ...) are UI actions, not tasks:
  // never inject into them, never count them in the ledger or calibration.
  if (prompt.trimStart().startsWith('/')) return;
  // Slash commands (/lazy:stats), bash mode (!) and memory notes (#) are
  // not real prompts: never inject into them, never count them in the
  // ledger, never let them pollute calibration.
  if (/^\s*[/!#]/.test(prompt)) return;

  const cfg = readJson(CONFIG, { enabled: true, level: 'full' });
  if (cfg.enabled === false) return;

  const { type, expected } = classify(prompt);

  // LAZY calibration: use measured values when ≥3 samples exist.
  const calib = readJson(CALIB, { alpha: 0.3, minSamples: 3, classes: {} });
  const c = calib.classes?.[type];
  let exp = expected;
  let factor = 0.35;
  let calibrated = false;
  if (c?.plain?.n >= (calib.minSamples ?? 3)) { exp = Math.round(c.plain.ewma); calibrated = true; }
  if (c?.plain?.n >= 3 && c?.injected?.n >= 3 && c.plain.ewma > 0) {
    factor = Math.min(0.6, Math.max(0.15, 1 - c.injected.ewma / c.plain.ewma));
    calibrated = true;
  }

  const budget = Math.max(120, Math.round(exp * Math.max(0.5, 1 - factor)));

  // Preference-framed context (factual statements, not system commands).
  const parts = [];
  if (type === 'reasoning') {
    parts.push('For math/logic the user prefers a numbered draft (each step \u22645 words) with the final answer after "####".');
  } else if (type !== 'writing') {
    parts.push('The user prefers ultra-terse replies: no preamble, no recap, no closing offers; fragments are fine; code, commands, URLs and numbers stay exact.');
  }
  if (type === 'coding') {
    parts.push('For code the user prefers the simplest working solution (delete > reuse > stdlib > platform-native > new code), no unrequested abstractions or dependencies, with deliberate shortcuts marked by a `lazy:` comment naming the upgrade path.');
  }
  parts.push(`The user's target response length for this request is about ${budget} tokens (soft ceiling; correctness may exceed it).`);

  const directive = parts.join(' ');
  const overhead = tok(directive);
  const savings = Math.round(exp * factor);
  const inject = exp >= 150 && savings > overhead * 1.5;

  // Ledger + pending record for the Stop-hook observer.
  try {
    mkdirSync(DIR, { recursive: true });
    appendFileSync(LEDGER, JSON.stringify({
      t: 'decide', ts: Date.now(), session: input.session_id || null,
      class: type, inject, calibrated, overhead: inject ? overhead : 0,
      predictedSavings: inject ? savings : 0, expected: exp,
      reason: inject ? 'net-positive' : (exp < 150 ? 'below-floor' : 'savings<=overhead'),
    }) + '\n');
    if (input.session_id) {
      writeFileSync(join(DIR, `pending-${input.session_id}.json`),
        JSON.stringify({ class: type, injected: inject, ts: Date.now() }));
    }
  } catch { /* ledger is best-effort */ }

  if (!inject) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `[iamtoolazy, user-installed efficiency plugin] ${directive}`,
    },
  }));
}

try { main(); } catch { /* fail open */ }
process.exit(0);
