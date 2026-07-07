#!/usr/bin/env node
// iamtoolazy — Stop hook: the LAZY "Learn" step.
// Reads last_assistant_message, updates on-device EWMA calibration for the
// class recorded by the prompt hook. Never blocks; fails open.

import { readFileSync, writeFileSync, appendFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.iamtoolazy');
const CALIB = join(DIR, 'calibration.json');
const LEDGER = join(DIR, 'stats.jsonl');
const tok = (s) => Math.max(1, Math.ceil(String(s).length / 4));

function main() {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  if (input.stop_hook_active) return; // loop guard
  const msg = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : '';
  if (!msg || !input.session_id) return;

  const pendingPath = join(DIR, `pending-${input.session_id}.json`);
  let pending;
  try { pending = JSON.parse(readFileSync(pendingPath, 'utf8')); } catch { return; }

  const actual = tok(msg);
  let calib;
  try { calib = JSON.parse(readFileSync(CALIB, 'utf8')); } catch { calib = { alpha: 0.3, minSamples: 3, classes: {} }; }
  const alpha = calib.alpha ?? 0.3;
  const cls = (calib.classes[pending.class] ??= { injected: { n: 0, ewma: 0 }, plain: { n: 0, ewma: 0 } });
  const s = pending.injected ? cls.injected : cls.plain;
  s.n += 1;
  s.ewma = s.n === 1 ? actual : (1 - alpha) * s.ewma + alpha * actual;

  mkdirSync(DIR, { recursive: true });
  writeFileSync(CALIB, JSON.stringify(calib, null, 2));
  appendFileSync(LEDGER, JSON.stringify({ t: 'observe', ts: Date.now(), class: pending.class, injected: pending.injected, actualTokens: actual }) + '\n');
  try { unlinkSync(pendingPath); } catch { /* already gone */ }
}

try { main(); } catch { /* fail open */ }
process.exit(0);
