// Workload validator — enforces benchmarks/workloads/SCHEMA.md.
// Usage: node benchmarks/validate.mjs   (exit 1 on any error)
// Also imported by benchmarks/test/workloads.test.mjs.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLASSES = ['coding', 'reasoning', 'qa', 'writing', 'history'];
const LANGS = ['en', 'id'];
const TAGS = ['verbose', 'medium', 'terse', 'code', 'url', 'numbers'];
const SINGLE_TURN_COUNT = 10;
const HISTORY_MIN_COUNT = 3;
const PROMPT_MAX_CHARS = 6000;
const HISTORY_MIN_TURNS = 6;
const HISTORY_MIN_PROBES = 2;

export const WORKLOADS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'workloads'
);

/**
 * Validate one parsed record. Returns an array of error strings (empty = ok).
 * @param {object} rec - parsed JSONL record
 * @param {{cls: string, lang: string, where: string}} ctx - expected class/lang
 *   from the filename and a location label for error messages
 */
export function validateRecord(rec, ctx) {
  const errs = [];
  const e = (msg) => errs.push(`${ctx.where}: ${msg}`);

  if (typeof rec !== 'object' || rec === null || Array.isArray(rec)) {
    e('record is not an object');
    return errs;
  }
  const idPattern = new RegExp(`^${ctx.cls}-${ctx.lang}-\\d{2}$`);
  if (typeof rec.id !== 'string' || !idPattern.test(rec.id)) {
    e(`id must match ${ctx.cls}-${ctx.lang}-NN, got ${JSON.stringify(rec.id)}`);
  }
  if (rec.class !== ctx.cls) e(`class must be "${ctx.cls}", got ${JSON.stringify(rec.class)}`);
  if (rec.lang !== ctx.lang) e(`lang must be "${ctx.lang}", got ${JSON.stringify(rec.lang)}`);
  if (rec.tags !== undefined) {
    if (!Array.isArray(rec.tags) || rec.tags.some((t) => !TAGS.includes(t))) {
      e(`tags must be an array drawn from [${TAGS.join(', ')}]`);
    }
  }
  if (rec.notes !== undefined && typeof rec.notes !== 'string') {
    e('notes must be a string when present');
  }

  if (ctx.cls === 'history') {
    validateHistoryFields(rec, e);
  } else {
    validateSingleTurnFields(rec, e);
  }
  return errs;
}

function validateSingleTurnFields(rec, e) {
  if (typeof rec.prompt !== 'string' || rec.prompt.trim().length === 0) {
    e('prompt must be a non-empty string');
  } else if (rec.prompt.length > PROMPT_MAX_CHARS) {
    e(`prompt exceeds ${PROMPT_MAX_CHARS} chars (${rec.prompt.length})`);
  }
  for (const key of ['turns', 'final_prompt', 'probes']) {
    if (key in rec) e(`single-turn record must not have "${key}"`);
  }
}

function validateHistoryFields(rec, e) {
  if ('prompt' in rec) e('history record must use final_prompt, not prompt');

  if (!Array.isArray(rec.turns) || rec.turns.length < HISTORY_MIN_TURNS) {
    e(`turns must be an array of >= ${HISTORY_MIN_TURNS}`);
  } else {
    rec.turns.forEach((t, i) => {
      if (!t || (t.role !== 'user' && t.role !== 'assistant')) {
        e(`turns[${i}].role must be user|assistant`);
      }
      if (typeof t?.content !== 'string' || t.content.trim().length === 0) {
        e(`turns[${i}].content must be a non-empty string`);
      }
      const expected = i % 2 === 0 ? 'user' : 'assistant';
      if (t?.role && t.role !== expected) {
        e(`turns[${i}] must alternate roles starting with user`);
      }
    });
  }

  if (typeof rec.final_prompt !== 'string' || rec.final_prompt.trim().length === 0) {
    e('final_prompt must be a non-empty string');
  }

  if (!Array.isArray(rec.probes) || rec.probes.length < HISTORY_MIN_PROBES) {
    e(`probes must be an array of >= ${HISTORY_MIN_PROBES}`);
  } else {
    const probeIds = new Set();
    rec.probes.forEach((p, i) => {
      for (const key of ['id', 'question', 'expected']) {
        if (typeof p?.[key] !== 'string' || p[key].trim().length === 0) {
          e(`probes[${i}].${key} must be a non-empty string`);
        }
      }
      if (p?.id) {
        if (probeIds.has(p.id)) e(`probes[${i}].id "${p.id}" duplicated in record`);
        probeIds.add(p.id);
      }
      const nTurns = Array.isArray(rec.turns) ? rec.turns.length : 0;
      if (!Number.isInteger(p?.source_turn) || p.source_turn < 0 || p.source_turn >= nTurns) {
        e(`probes[${i}].source_turn must be a valid index into turns (0..${nTurns - 1})`);
      }
    });
  }
}

/**
 * Validate every workload file in a directory.
 * @returns {{errors: string[], files: number, records: number}}
 */
export function validateAll(dir = WORKLOADS_DIR) {
  const errors = [];
  const seenIds = new Set();
  const seenPrompts = new Set();
  let files = 0;
  let records = 0;

  const jsonlFiles = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();

  // Every class-lang pair must exist — a silently missing file would
  // shrink the benchmark without anyone noticing.
  for (const cls of CLASSES) {
    for (const lang of LANGS) {
      if (!jsonlFiles.includes(`${cls}-${lang}.jsonl`)) {
        errors.push(`missing workload file: ${cls}-${lang}.jsonl`);
      }
    }
  }

  for (const file of jsonlFiles) {
    files += 1;
    const m = /^([a-z]+)-([a-z]{2})\.jsonl$/.exec(file);
    if (!m || !CLASSES.includes(m[1]) || !LANGS.includes(m[2])) {
      errors.push(`${file}: filename must be {class}-{lang}.jsonl with known class and lang`);
      continue;
    }
    const [, cls, lang] = m;
    const lines = readFileSync(join(dir, file), 'utf8').split('\n').filter((l) => l.trim() !== '');

    const expected = cls === 'history' ? HISTORY_MIN_COUNT : SINGLE_TURN_COUNT;
    const op = cls === 'history' ? '>=' : '==';
    const countOk = cls === 'history' ? lines.length >= expected : lines.length === expected;
    if (!countOk) {
      errors.push(`${file}: expected ${op} ${expected} records, found ${lines.length}`);
    }

    lines.forEach((line, idx) => {
      records += 1;
      const where = `${file}:${idx + 1}`;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch (err) {
        errors.push(`${where}: invalid JSON — ${err.message}`);
        return;
      }
      errors.push(...validateRecord(rec, { cls, lang, where }));

      if (typeof rec.id === 'string') {
        if (seenIds.has(rec.id)) errors.push(`${where}: duplicate id "${rec.id}"`);
        seenIds.add(rec.id);
      }
      const text = rec.prompt ?? rec.final_prompt;
      if (typeof text === 'string') {
        if (seenPrompts.has(text)) errors.push(`${where}: duplicate prompt text (already used by another record)`);
        seenPrompts.add(text);
      }
    });
  }

  return { errors, files, records };
}

// CLI entry
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { errors, files, records } = validateAll();
  if (errors.length > 0) {
    for (const err of errors) console.error(`FAIL ${err}`);
    console.error(`\n${errors.length} error(s) across ${files} file(s), ${records} record(s).`);
    process.exit(1);
  }
  console.log(`OK — ${files} file(s), ${records} record(s), 0 errors. (${basename(WORKLOADS_DIR)})`);
}
