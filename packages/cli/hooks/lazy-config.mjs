#!/usr/bin/env node
// iamtoolazy — /lazy config helper: on | off | lite | full | ultra | status
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.iamtoolazy');
const CONFIG = join(DIR, 'config.json');
let cfg;
try { cfg = JSON.parse(readFileSync(CONFIG, 'utf8')); } catch { cfg = { enabled: true, level: 'full' }; }

const arg = (process.argv[2] || 'status').toLowerCase();
if (arg === 'on') cfg.enabled = true;
else if (arg === 'off') cfg.enabled = false;
else if (['lite', 'full', 'ultra'].includes(arg)) { cfg.enabled = true; cfg.level = arg; }
else if (arg !== 'status') { console.log(`unknown: "${arg}" — use on | off | lite | full | ultra | status`); process.exit(0); }

mkdirSync(DIR, { recursive: true });
writeFileSync(CONFIG, JSON.stringify(cfg, null, 2));
console.log(`iamtoolazy: ${cfg.enabled ? `ON (level: ${cfg.level})` : 'OFF'} — config: ${CONFIG}`);
