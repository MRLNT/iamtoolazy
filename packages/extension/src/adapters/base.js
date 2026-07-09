// iamtoolazy — adapter helpers shared by all sites.
// Design rule: selectors WILL rot. Every adapter carries a selector
// ladder (most-specific first) and every consumer must tolerate null.

/** First element matching any selector in the ladder. */
export function firstMatch(selectors, root = document) {
  for (const s of selectors) {
    try {
      const el = root.querySelector(s);
      if (el) return el;
    } catch { /* invalid selector in an older Chrome — skip */ }
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

/**
 * Set text in a way React/ProseMirror/Quill editors accept.
 * textarea/input → native value setter + input event (React-safe);
 * contenteditable → selectAll + insertText command, textContent fallback.
 */
export function setText(el, text) {
  if (!el) return false;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, text); else el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  el.focus();
  const sel = window.getSelection();
  sel.selectAllChildren(el);
  let ok = false;
  try { ok = document.execCommand('insertText', false, text); } catch { /* deprecated but alive */ }
  if (!ok) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }
  return true;
}

/** Last-resort target: whatever editable thing has focus. */
export function focusedEditable() {
  const el = document.activeElement;
  if (!el) return null;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el;
  if (el.isContentEditable) return el;
  return null;
}
