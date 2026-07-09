// iamtoolazy — adapter helpers shared by all sites.
// Design rule: selectors WILL rot. Every adapter carries a selector
// ladder (most-specific first) and every consumer must tolerate null.

function visible(el) {
  if (!el.getClientRects().length) return false;
  const st = getComputedStyle(el);
  return st.visibility !== 'hidden' && st.display !== 'none';
}

/**
 * Pick the composer from a selector ladder. Field lesson (Fase 3.B):
 * generic rungs can catch huge wrapper containers. Guards, per rung:
 * visible only → innermost only (drop any candidate that contains
 * another candidate) → bottom-most on screen (composers live at the
 * bottom). First rung with a survivor wins.
 */
export function firstMatch(selectors, root = document) {
  for (const s of selectors) {
    let cands;
    try { cands = [...root.querySelectorAll(s)].filter(visible); } catch { continue; }
    if (!cands.length) continue;
    const innermost = cands.filter((a) => !cands.some((b) => b !== a && a.contains(b)));
    innermost.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    if (innermost[0]) return innermost[0];
  }
  return null;
}

/** Wait up to `ms` for the ladder to match (SPAs render inputs late). */
export function waitForInput(selectors, ms = 10000) {
  return new Promise((resolve) => {
    const found = firstMatch(selectors);
    if (found) return resolve(found);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const el = firstMatch(selectors);
      if (el || Date.now() - t0 > ms) {
        clearInterval(iv);
        resolve(el || null);
      }
    }, 500);
  });
}

export function getText(el) {
  if (!el) return '';
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value;
  return el.innerText || '';
}

const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/**
 * Editor-safe text replacement — Fase 3.B field lessons, round 2:
 *
 *  - Editors apply changes ASYNC → verify only after a frame + settle
 *    delay (round 1's instant read-back produced false "failed"s).
 *  - NEVER document.execCommand('selectAll'): if focus hasn't landed it
 *    selects the WHOLE PAGE (caught on gemini). Selection is built with
 *    Range.selectNodeContents(el), scoped to the composer only.
 *  - NEVER dispatch synthetic paste events: unknown site handlers can
 *    fire (chatgpt inserted "undefined" and auto-submitted). Removed
 *    permanently — insertText via a real command is the only write path.
 *
 * Returns { ok, method }; async — callers await and handle ok === false.
 */
export async function setText(el, text) {
  if (!el) return { ok: false, method: 'none' };
  const verify = () => norm(getText(el)) === norm(text);
  const settle = async () => { await nextFrame(); await sleep(80); };

  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, text); else el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    return { ok: verify(), method: 'value' };
  }

  try {
    el.focus();
    await nextFrame(); // let focus actually land before touching selection
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.addRange(range);
    document.execCommand('insertText', false, text);
    await settle();
    if (verify()) return { ok: true, method: 'insertText' };
  } catch { /* fall through to the honest failure */ }

  return { ok: verify(), method: 'failed' };
}

/** Last-resort target: whatever editable thing has focus. */
export function focusedEditable() {
  const el = document.activeElement;
  if (!el) return null;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el;
  if (el.isContentEditable) return el;
  return null;
}
