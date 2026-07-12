import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePdfText, PDF_PAGE_TOKENS } from '../src/pdftext.js';

test('pdftext: ragged page text is collapsed, markers keep page numbers', () => {
  const { text, pageCount, emptyPages } = normalizePdfText(
    ['Tournament   rules\n\n\n\nSection  1', 'Format:  knockout'],
    { name: 'rules.pdf' }
  );
  assert.equal(pageCount, 2);
  assert.equal(emptyPages, 0);
  assert.ok(text.startsWith('[PDF: rules.pdf · 2 pages, extracted locally]'));
  assert.ok(text.includes('--- page 1 ---\nTournament rules\n\nSection 1'));
  assert.ok(text.includes('--- page 2 ---\nFormat: knockout'));
});

test('pdftext: empty pages (image-only scans) are counted and skipped', () => {
  const { text, emptyPages } = normalizePdfText(['', 'real content', '   \n  ']);
  assert.equal(emptyPages, 2);
  assert.ok(text.includes('--- page 2 ---'));
  assert.ok(!text.includes('--- page 1 ---'));
  assert.ok(!text.includes('--- page 3 ---'));
});

test('pdftext: a fully empty scan yields empty text — caller must say so honestly', () => {
  const { text, pageCount } = normalizePdfText(['', '']);
  assert.equal(text, '');
  assert.equal(pageCount, 2);
});

test('pdftext: page-token constant stays at the conservative low end', () => {
  assert.equal(PDF_PAGE_TOKENS, 1500);
});
