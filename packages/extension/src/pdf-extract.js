// iamtoolazy — PDF text extraction (Fase 3.F).
//
// This file is bundled SEPARATELY (dist/pdf-extract.js, ~1.3 MB with
// pdfjs inside) and dynamically imported only after BOTH consents:
// the Options toggle is on AND you clicked "Extract text" for this file.
// If you never use the feature, this megabyte is never even loaded.
//
// Zero network holds: pdfjs ships inside the extension, runs in this tab,
// and we force the in-process fake worker — no worker fetch, no eval.

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.js';

// pdfjs's "fake worker" path looks for the worker module on globalThis.
globalThis.pdfjsWorker = pdfjsWorker;
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

/**
 * Extract per-page text from a PDF.
 * @param {ArrayBuffer} data
 * @returns {Promise<{pages: string[], numPages: number}>}
 */
export async function extractPdfText(data) {
  const doc = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // items carry per-run strings; hasEOL marks pdf-internal line breaks
    let text = '';
    for (const item of content.items) {
      text += item.str;
      text += item.hasEOL ? '\n' : ' ';
    }
    pages.push(text);
    page.cleanup();
  }
  await doc.destroy();
  return { pages, numPages: pages.length };
}
