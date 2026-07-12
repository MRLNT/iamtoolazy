// LAZY · PDF→text (Fase 3.F) — the pure half of the extension's
// consent-gated PDF extraction. pdfjs hands us raw per-page strings;
// this module turns them into a prompt-ready block. No pdfjs here:
// extraction is browser-side, normalization is testable everywhere.

/** Tokens a provider bills per PDF page uploaded AS A FILE (text layer +
 *  page image). Anthropic documents 1,500–3,000/page; we use the LOW end
 *  so the advertised saving is conservative. Estimates, as ever. */
export const PDF_PAGE_TOKENS = 1500;

/**
 * Normalize extracted PDF pages into one prompt-ready text block.
 * - collapses intra-page whitespace runs (PDF text layers are ragged)
 * - drops empty pages (scans with no text layer yield nothing useful)
 * - keeps page markers so "see page 3" stays answerable
 * @param {string[]} pages raw text per page, index 0 = page 1
 * @param {{name?: string}} [opts] original filename for the header
 * @returns {{text: string, pageCount: number, emptyPages: number}}
 */
export function normalizePdfText(pages, opts = {}) {
  const cleaned = (pages || []).map((p) =>
    String(p || '')
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n') // trim around breaks, keep the breaks
      .replace(/\n{3,}/g, '\n\n') // runs of breaks = one paragraph gap
      .trim()
  );
  const emptyPages = cleaned.filter((p) => !p).length;
  const parts = [];
  cleaned.forEach((p, i) => {
    if (p) parts.push(`--- page ${i + 1} ---\n${p}`);
  });
  const header = `[PDF: ${opts.name || 'document'} · ${cleaned.length} page${cleaned.length === 1 ? '' : 's'}, extracted locally]`;
  const text = parts.length ? `${header}\n${parts.join('\n\n')}` : '';
  return { text, pageCount: cleaned.length, emptyPages };
}
