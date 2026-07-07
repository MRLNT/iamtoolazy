// Lightweight language detection: Indonesian vs English.
// iamtoolazy compresses style, never translates — so we only need to know
// which rule set and which template labels to use.

const ID_STOPWORDS = new Set([
  'yang', 'dan', 'untuk', 'dengan', 'tidak', 'saya', 'kamu', 'anda', 'ini',
  'itu', 'di', 'ke', 'dari', 'akan', 'bisa', 'sudah', 'belum', 'juga',
  'atau', 'pada', 'dalam', 'agar', 'supaya', 'karena', 'kalau', 'jika',
  'buat', 'buatkan', 'tolong', 'mohon', 'jangan', 'harus', 'saja', 'lebih',
]);

const EN_STOPWORDS = new Set([
  'the', 'and', 'is', 'are', 'to', 'of', 'you', 'that', 'it', 'for',
  'with', 'this', 'not', 'have', 'has', 'will', 'can', 'could', 'would',
  'should', 'please', 'make', 'write', 'do', 'don\u2019t', "don't", 'a', 'an',
  'my', 'me', 'in', 'on',
]);

/**
 * Detect prompt language.
 * @param {string} text
 * @returns {'id'|'en'} best guess; defaults to 'en' on a tie
 */
export function detectLang(text) {
  const words = String(text).toLowerCase().match(/[\p{L}'\u2019-]+/gu) || [];
  let id = 0;
  let en = 0;
  for (const w of words) {
    if (ID_STOPWORDS.has(w)) id++;
    if (EN_STOPWORDS.has(w)) en++;
  }
  return id > en ? 'id' : 'en';
}
