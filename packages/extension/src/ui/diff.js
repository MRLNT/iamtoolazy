// iamtoolazy — preview diff overlay (Fase 3.C).
// Shows EXACTLY what compression would remove before anything changes:
// struck-red spans = removed, locked style = code/URLs (never touched by
// design), an editable result box, and explicit Apply / Copy / Skip.
// Shadow DOM, zero site CSS bleed, Esc or backdrop click = Skip.

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Build the "before" HTML: removed parts struck, protected-looking
 *  spans (inline code, fenced code, URLs) rendered with a lock style.
 *  Display-only — the real protection lives in the compressor. */
function renderBefore(before, removed) {
  const ranges = [];
  let cursor = 0;
  for (const r of removed || []) {
    const i = before.indexOf(r.text, cursor);
    if (i === -1) continue;
    ranges.push({ start: i, end: i + r.text.length, cls: 'rm' });
    cursor = i + r.text.length;
  }
  const lockRe = /```[\s\S]*?```|`[^`\n]+`|https?:\/\/\S+/g;
  for (let m; (m = lockRe.exec(before)); ) {
    ranges.push({ start: m.index, end: m.index + m[0].length, cls: 'lock' });
  }
  ranges.sort((a, b) => a.start - b.start);

  let html = '';
  let pos = 0;
  for (const r of ranges) {
    if (r.start < pos) continue; // defensive: drop overlaps
    html += esc(before.slice(pos, r.start));
    html += `<span class="${r.cls}">${esc(before.slice(r.start, r.end))}</span>`;
    pos = r.end;
  }
  html += esc(before.slice(pos));
  return html;
}

export function showPreview({ before, after, removed, bTok, aTok, onApply, onCopy }) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(host);
  const close = () => host.remove();

  const pct = Math.max(0, Math.round((1 - aTok / bTok) * 100));
  root.innerHTML = `
    <style>
      .back { position:fixed; inset:0; background:rgba(1,4,9,.6); }
      .card { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
              width:min(640px, 92vw); max-height:82vh; overflow:auto;
              background:#0d1117; color:#c9d1d9; border:1px solid #30363d;
              border-radius:12px; padding:18px 20px;
              font:13px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
              box-shadow:0 12px 40px rgba(0,0,0,.6); }
      h2 { margin:0 0 2px; font-size:14px; color:#e6edf3; }
      .sub { color:#8b949e; margin-bottom:12px; }
      .save { color:#3fb950; font-weight:bold; }
      .label { color:#8b949e; margin:12px 0 4px; font-size:11px;
               text-transform:uppercase; letter-spacing:.06em; }
      .pane { background:#161b22; border:1px solid #21262d; border-radius:8px;
              padding:10px 12px; white-space:pre-wrap; overflow-wrap:anywhere; }
      .rm   { background:rgba(248,81,73,.18); color:#ff7b72;
              text-decoration:line-through; border-radius:3px; padding:0 1px; }
      .lock { background:rgba(88,166,255,.14); color:#79c0ff; border-radius:3px;
              padding:0 1px; }
      textarea { width:100%; box-sizing:border-box; min-height:76px; resize:vertical;
                 background:#161b22; color:#c9d1d9; border:1px solid #21262d;
                 border-radius:8px; padding:10px 12px; font:inherit; }
      textarea:focus { outline:1px solid #1f6feb; }
      .row { display:flex; gap:8px; align-items:center; margin-top:14px; }
      button { border-radius:6px; padding:7px 14px; font:inherit; cursor:pointer;
               border:1px solid #30363d; background:#21262d; color:#c9d1d9; }
      .apply { background:#1a7f37; border-color:#1a7f37; color:#fff; font-weight:bold; }
      .right { margin-left:auto; color:#8b949e; font-size:11px; }
      .legend span { margin-right:12px; }
    </style>
    <div class="back"></div>
    <div class="card" role="dialog" aria-label="iamtoolazy preview">
      <h2>🐨 iamtoolazy — preview</h2>
      <div class="sub">nothing is sent, nothing changed yet ·
        <span class="save">~${bTok} → ~${aTok} tok (−${pct}%, estimates)</span></div>
      <div class="label">before <span class="legend">· <span class="rm">removed</span>
        <span class="lock">protected</span></span></div>
      <div class="pane" id="before"></div>
      <div class="label">after — edit freely, then apply</div>
      <textarea id="after" spellcheck="false"></textarea>
      <div class="row">
        <button class="apply" id="apply">Apply</button>
        <button id="copy">Copy</button>
        <button id="skip">Skip</button>
        <span class="right">Esc = skip · Enter / ⌘Enter = apply</span>
      </div>
    </div>`;

  root.getElementById('before').innerHTML = renderBefore(before, removed);
  const ta = root.getElementById('after');
  ta.value = after;

  const apply = () => { const v = ta.value; close(); onApply(v); };
  root.getElementById('apply').addEventListener('click', apply);
  root.getElementById('copy').addEventListener('click', async () => {
    const ok = await onCopy(ta.value);
    root.getElementById('copy').textContent = ok ? 'Copied 📋' : 'Copy failed';
  });
  root.getElementById('skip').addEventListener('click', close);
  root.querySelector('.back').addEventListener('click', close);

  // ── The overlay OWNS the keyboard while open (Fase 3.C field lesson) ──
  // Chat sites install global key listeners ("type anywhere → focus the
  // composer") that steal keystrokes from our textarea. Two defenses:
  //
  // 1) Boundary stop (bubble phase, on the host): our inner handlers and
  //    the browser's default typing run first, then propagation dies at
  //    the host — the site's document/window listeners never hear it.
  for (const t of ['keydown', 'keyup', 'keypress', 'input', 'paste', 'cut', 'copy']) {
    host.addEventListener(t, (e) => e.stopPropagation());
  }
  // 2) Our own keys at window-capture, scoped to the overlay:
  //    Esc = skip · ⌘/Ctrl+Enter = apply anywhere · plain Enter = apply
  //    when focus is OUTSIDE the textarea (inside it, Enter = newline).
  const onKey = (e) => {
    if (!host.isConnected) { window.removeEventListener('keydown', onKey, true); return; }
    if (!e.composedPath().includes(host)) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    const inTextarea = root.activeElement === ta;
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !inTextarea)) {
      e.preventDefault(); e.stopPropagation(); apply();
    }
  };
  window.addEventListener('keydown', onKey, true);

  ta.focus();
}
