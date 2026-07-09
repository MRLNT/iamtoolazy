// Pick the adapter for the current hostname; expose a uniform surface.
import { firstMatch, waitForInput, getText, setText, focusedEditable } from './base.js';
import claude from './claude.js';
import chatgpt from './chatgpt.js';
import gemini from './gemini.js';

const ADAPTERS = [claude, chatgpt, gemini];

export function getAdapter(hostname = location.hostname) {
  const h = hostname.replace(/^www\./, '');
  const def = ADAPTERS.find((a) => h === a.site || h.endsWith('.' + a.site));
  if (!def) return null;
  return {
    site: def.site,
    findInput: () => firstMatch(def.inputSelectors) || focusedEditable(),
    waitForInput: (ms) => waitForInput(def.inputSelectors, ms),
    getText,
    setText,
  };
}
