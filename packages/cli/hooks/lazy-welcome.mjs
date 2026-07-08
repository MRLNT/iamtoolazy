#!/usr/bin/env node
// iamtoolazy — SessionStart hook: one-time welcome after install.
// Fires only when no config exists yet (first ever session); writes the
// recommended defaults and asks Claude to give a 5-line orientation.
// Every later session: silent. Fails open.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.iamtoolazy');
const CONFIG = join(DIR, 'config.json');

function main() {
  readFileSync(0, 'utf8'); // drain stdin
  if (existsSync(CONFIG)) return; // not the first run → silent

  mkdirSync(DIR, { recursive: true });
  writeFileSync(CONFIG, JSON.stringify({ enabled: true, level: 'full' }, null, 2));

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        '[iamtoolazy, user-installed efficiency plugin — first session after install] ' +
        'Before handling anything else, greet the user with a short orientation (max 6 lines, their language): ' +
        '1) iamtoolazy is now active with recommended defaults: it saves tokens automatically by attaching tiny directives only when predicted savings beat the cost — short prompts cost zero. ' +
        '2) It measures responses on-device to calibrate to their usage; all data stays in ~/.iamtoolazy/, zero telemetry. ' +
        '3) Point them to /lazy:help (full menu), /lazy:status, and /lazy:off to disable anytime. ' +
        'Then proceed with their request normally.',
    },
  }));
}

try { main(); } catch { /* fail open */ }
process.exit(0);
