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

/**
 * Editor-safe text replacement with VERIFICATION (Fase 3.B field lesson:
 * ProseMirror/Quill/React editors can silently re-render our write away,
 * leaving an empty box while we report success).
 *
 * Strategy ladder, each step read-back-verified:
 *  1. textarea/input → native value setter + input event
 *  2. contenteditable → focus + selectAll + execCommand('insertText')
 *  3. contenteditable → synthetic paste event (all major editors accept)
 * Returns { ok, method } — callers must handle ok === false.
 */
export function setText(el, text) {
  if (!el) return { ok: false, method: 'none' };
  const verify = () => norm(getText(el)) === norm(text);

  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, text); else el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: verify(), method: 'value' };
  }

  el.focus();
  try {
    document.execCommand('selectAll');
    if (document.execCommand('insertText', false, text) && verify()) {
      return { ok: true, method: 'insertText' };
    }
  } catch { /* fall through */ }

  try {
    el.focus();
    document.execCommand('selectAll');
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    if (verify()) return { ok: true, method: 'paste' };
  } catch { /* fall through */ }

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
