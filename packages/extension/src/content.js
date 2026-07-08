// iamtoolazy — content entry (bundled by esbuild from @iamtoolazy/core).
// Scaffold scope (Fase 3.A): prove the core engine runs inside the page
// and report which site we're on. Adapters attach in Fase 3.B.
import { estimateTokens, compress } from '../../core/src/index.js';

const site = location.hostname.replace(/^www\./, '');
const KNOWN = ['claude.ai', 'chatgpt.com', 'gemini.google.com'];

(async () => {
  const settings = (await chrome.storage.local.get('settings')).settings || {};
  const mode = settings[site] || 'preview';

  // Self-test: run the real pipeline pieces once on a sample, so a broken
  // bundle is loud in the console instead of silently dead.
  const sample = 'Hi! Could you please maybe help me with this? Thanks!';
  const c = compress(sample, { level: 'full' });
  const t = estimateTokens(sample);

  console.info(
    `%c🐨 iamtoolazy%c attached on ${site} · mode: ${mode} · core ok ` +
    `(sample: ${t} tok → compressed ${estimateTokens(c.output)} tok) · ` +
    `adapters arrive in Fase 3.B`,
    'font-weight:bold', ''
  );

  // Debug handle for field inspection.
  window.__iamtoolazy = { site, mode, known: KNOWN.includes(site) };
})();
