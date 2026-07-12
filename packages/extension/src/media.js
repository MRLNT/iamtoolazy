// iamtoolazy — media savers (Fase 3.F).
//
// Image downscale, confirm-first: models cap useful visual detail well
// below a 4K screenshot — resolution above the ceiling only burns vision
// tokens. When a file input receives an oversized image we HOLD the
// site's change event (capture phase, synchronously), show the estimated
// saving, and release either the downscaled files or the untouched
// originals. The site never sees a change event until you choose.
//
// Design rails:
//  - hold is synchronous (stopImmediatePropagation in capture phase);
//    the decision is async; release is guaranteed by try/catch — a bug
//    in our code degrades to "originals pass through", never to a stuck
//    upload
//  - a released event is marked passOnce so it flows through untouched;
//    the flow is self-terminating by construction
//  - all numbers labeled estimates; ledger entries carry kind 'image'
//  - zero network: decode, canvas, re-encode — everything in this tab

import { planImageDownscale, normalizePdfText, PDF_PAGE_TOKENS, estimateTokens } from '../../core/src/index.js';

const MAX_SIDE = 1092; // Claude's effective detail ceiling; see core/media.js
const IMG_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// PDF→text is double-gated: this Options toggle (off by default — it
// admits a ~1.3 MB pdfjs module) AND a per-file confirm. The toggle is
// cached here because the event hold must be synchronous; storage
// changes keep the cache live.
let pdfEnabled = false;
async function loadPdfFlag() {
  try {
    const { settings = {} } = await chrome.storage.local.get('settings');
    pdfEnabled = settings.pdfText === true;
  } catch { pdfEnabled = false; }
}
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      pdfEnabled = changes.settings.newValue?.pdfText === true;
    }
  });
} catch { /* storage bridge gone; flag stays as-is */ }

// Inputs whose next change event must pass through untouched (our own
// re-dispatch after Downscale / Keep original).
const passOnce = new WeakSet();

let host, root, escHandler;
function overlay(html, buttons) {
  if (!host) {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;';
    root = host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(host);
  }
  root.innerHTML = `
    <style>
      .pill { background:#0d1117; color:#c9d1d9; border:1px solid #30363d;
              border-radius:10px; padding:12px 14px; max-width:440px;
              font:12px/1.5 ui-monospace,Menlo,monospace;
              box-shadow:0 4px 16px rgba(0,0,0,.5); }
      .row { display:flex; gap:8px; margin-top:10px; }
      button { background:#21262d; color:#58a6ff; border:1px solid #30363d;
               border-radius:6px; padding:4px 12px; font:inherit; cursor:pointer; }
      button.primary { background:#238636; color:#fff; border-color:#2ea043; }
      .save { color:#3fb950; font-weight:bold; }
      .dim { color:#8b949e; }
      b { color:#e6edf3; }
    </style>
    <div class="pill">${html}<div class="row"></div></div>`;
  const row = root.querySelector('.row');
  const close = () => {
    root.innerHTML = '';
    if (escHandler) { document.removeEventListener('keydown', escHandler, true); escHandler = null; }
  };
  for (const { label, primary, onClick } of buttons) {
    const b = document.createElement('button');
    if (primary) b.className = 'primary';
    b.textContent = label;
    b.addEventListener('click', () => { close(); onClick(); });
    row.appendChild(b);
  }
  // Esc = the non-primary (safe) choice, same contract as the diff overlay.
  const safe = buttons.find((b) => !b.primary);
  escHandler = (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
    if (safe) safe.onClick();
  };
  document.addEventListener('keydown', escHandler, true);
}

async function appendLedger(entry) {
  try {
    const { ledger = [] } = await chrome.storage.local.get('ledger');
    ledger.push(entry);
    await chrome.storage.local.set({ ledger: ledger.slice(-200) });
  } catch { /* ledger is best-effort */ }
}

/** Decode dimensions off-DOM. Returns null on failure (corrupt file, etc). */
async function readDims(file) {
  try {
    const bmp = await createImageBitmap(file);
    const d = { width: bmp.width, height: bmp.height };
    bmp.close();
    return d;
  } catch { return null; }
}

/** Canvas resize preserving type; falls back to the original on any error. */
async function downscale(file, targetWidth, targetHeight) {
  try {
    const bmp = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    canvas.getContext('2d').drawImage(bmp, 0, 0, targetWidth, targetHeight);
    bmp.close();
    const type = IMG_TYPES.has(file.type) ? file.type : 'image/png';
    const quality = type === 'image/jpeg' || type === 'image/webp' ? 0.9 : undefined;
    const blob = await canvas.convertToBlob({ type, quality });
    return new File([blob], file.name, { type, lastModified: Date.now() });
  } catch { return file; }
}

/** Hand the (possibly rewritten) file list back to the site. */
function releaseWith(input, files) {
  try {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    input.files = dt.files;
  } catch { /* keep whatever the input already holds */ }
  passOnce.add(input);
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function decide(input, files, site) {
  let released = false;
  const release = (out) => {
    if (released) return;
    released = true;
    releaseWith(input, out || files);
  };
  try {
    const images = files.filter((f) => IMG_TYPES.has(f.type));
    const dims = await Promise.all(images.map(readDims));
    const known = [];
    images.forEach((f, i) => { if (dims[i]) known.push({ file: f, name: f.name, ...dims[i] }); });
    if (!known.length) return release();

    const provider = site === 'chatgpt.com' ? 'openai' : 'claude';
    const plan = planImageDownscale(known, { maxSide: MAX_SIDE, provider });
    if (!plan.shouldOffer) return release();

    // plan.items is index-aligned with `known` — pair by position, never
    // by name (duplicate filenames are a thing).
    const byFile = new Map();
    known.forEach((k, i) => byFile.set(k.file, plan.items[i]));

    const big = plan.items.filter((i) => i.shrink);
    const pct = Math.round((plan.totalSaved / Math.max(1, plan.totalBefore)) * 100);
    overlay(
      `🐨 <b>big image${big.length > 1 ? 's' : ''} attached — nothing uploaded yet</b><br>` +
      big.map((i) =>
        `<span class="dim">${i.name}: ${i.width}×${i.height} → ${i.targetWidth}×${i.targetHeight}</span>`
      ).join('<br>') +
      `<br>vision tokens ~${plan.totalBefore} → <span class="save">~${plan.totalAfter} (−${pct}%, estimates)</span>` +
      `<br><span class="dim">above ~${MAX_SIDE}px the model sees no extra detail — it only costs more.</span>`,
      [
        {
          label: 'Downscale', primary: true, onClick: async () => {
            const out = [];
            for (const f of files) {
              const it = byFile.get(f);
              out.push(it && it.shrink ? await downscale(f, it.targetWidth, it.targetHeight) : f);
            }
            release(out);
            appendLedger({ ts: Date.now(), site, kind: 'image', beforeTok: plan.totalBefore, afterTok: plan.totalAfter });
          },
        },
        { label: 'Keep original', onClick: () => release() },
      ]
    );
  } catch {
    release();
  }
}

async function decidePdf(input, files, site, adapter) {
  let released = false;
  const release = (out) => {
    if (released) return;
    released = true;
    releaseWith(input, out || files);
  };
  try {
    const pdfs = files.filter((f) => f.type === 'application/pdf');
    const others = files.filter((f) => f.type !== 'application/pdf');
    const mb = (pdfs.reduce((a, f) => a + f.size, 0) / (1024 * 1024)).toFixed(1);
    overlay(
      `🐨 <b>PDF attached — nothing uploaded yet</b><br>` +
      pdfs.map((f) => `<span class="dim">${f.name} · ${(f.size / (1024 * 1024)).toFixed(1)} MB</span>`).join('<br>') +
      `<br>as a file, a PDF bills roughly ~${PDF_PAGE_TOKENS}+ tok <i>per page</i> (estimates).` +
      `<br><span class="dim">extract the text layer instead? runs locally in this tab — the file never uploads.</span>`,
      [
        {
          label: 'Extract text', primary: true, onClick: async () => {
            try {
              const mod = await import(chrome.runtime.getURL('dist/pdf-extract.js'));
              const blocks = [];
              let pageTotal = 0;
              let emptyTotal = 0;
              for (const f of pdfs) {
                const { pages } = await mod.extractPdfText(await f.arrayBuffer());
                const { text, pageCount, emptyPages } = normalizePdfText(pages, { name: f.name });
                pageTotal += pageCount;
                emptyTotal += emptyPages;
                if (text) blocks.push(text);
              }
              if (!blocks.length) {
                overlay(
                  `🐨 <b>no text layer found</b> (${mb} MB, likely a scan).<br>` +
                  `<span class="dim">nothing extracted — uploading the original unchanged.</span>`,
                  [{ label: 'OK', primary: true, onClick: () => release() }]
                );
                return;
              }
              const el = adapter?.findInput?.();
              if (!el) { release(); return; }
              const combined = blocks.join('\n\n');
              const existing = adapter.getText(el);
              const wrote = await adapter.setText(el, existing.trim() ? `${existing}\n\n${combined}` : combined);
              if (!wrote.ok) { release(); return; }
              release(others); // the PDFs never upload; other files pass through
              const afterTok = estimateTokens(combined);
              const beforeTok = pageTotal * PDF_PAGE_TOKENS;
              appendLedger({ ts: Date.now(), site, kind: 'pdf', beforeTok, afterTok });
              overlay(
                `🐨 <b>extracted ${pageTotal} page${pageTotal === 1 ? '' : 's'} → ~${afterTok} tok as text</b>` +
                ` <span class="dim">(vs ~${beforeTok}+ as a file, estimates${emptyTotal ? ` · ${emptyTotal} empty page${emptyTotal === 1 ? '' : 's'} skipped` : ''})</span><br>` +
                `<span class="dim">review it in the composer — nothing sent yet.</span>`,
                [{ label: 'OK', primary: true, onClick: () => {} }]
              );
            } catch {
              release();
            }
          },
        },
        { label: 'Upload PDF', onClick: () => release() },
      ]
    );
  } catch {
    release();
  }
}

export function initMediaSavers(adapter, site) {
  loadPdfFlag();
  document.addEventListener('change', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    if (passOnce.has(input)) { passOnce.delete(input); return; }
    const files = [...(input.files || [])];
    const hasPdf = pdfEnabled && files.some((f) => f.type === 'application/pdf');
    const hasImg = files.some((f) => IMG_TYPES.has(f.type));
    if (!hasPdf && !hasImg) return; // not ours — don't touch
    // HOLD the event synchronously; everything after this is async.
    e.stopImmediatePropagation();
    if (hasPdf) decidePdf(input, files, site, adapter);
    else decide(input, files, site);
  }, true);
}
