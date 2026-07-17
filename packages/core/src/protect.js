// Protected-span masking.
//
// Everything technical must survive compression byte-for-byte:
// fenced code, inline code, URLs, file names, paths, quoted strings.
// Strategy: swap protected spans for \u0000{n}\u0000 placeholders that no
// compression rule can match, compress, then restore.

const PATTERNS = [
  /```[\s\S]*?```/g,                                     // fenced code blocks
  /`[^`\n]+`/g,                                          // inline code
  /https?:\/\/[^\s)\]>"']+/g,                            // URLs
  /\b[\w.-]+\.(?:js|mjs|cjs|ts|tsx|jsx|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|sql|sh|bash|zsh|yml|yaml|toml|json|md|txt|csv|html|css|scss|xml|env|lock|png|jpe?g|webp|svg|pdf)\b/gi, // file names
  /(?:\.{1,2})?\/[\w.-]+(?:\/[\w.-]+)+\/?/g,             // unix-style paths
  /"[^"\n]+"/g,                                          // double-quoted strings
  /(?<=^|[\s(,:=[])'[^'\n]+'(?=$|[\s),.:;\]?!])/gm,      // single-quoted (lookaround avoids contractions like don't)
];

/**
 * Replace protected spans with placeholders.
 * @param {string} text
 * @returns {{masked: string, spans: string[]}}
 */
export function mask(text) {
  const spans = [];
  let masked = String(text);
  for (const re of PATTERNS) {
    masked = masked.replace(re, (m) => {
      const key = `\u0000${spans.length}\u0000`;
      spans.push(m);
      return key;
    });
  }
  return { masked, spans };
}

/**
 * Restore placeholders back to their original spans.
 * @param {string} masked
 * @param {string[]} spans
 * @returns {string}
 */
export function unmask(masked, spans) {
  // Spans can nest: a single-quoted-string pattern may wrap an
  // already-masked URL, so a restored span can itself contain a
  // placeholder. A single replace pass would leave the inner one behind
  // (e.g. fetch('<url>') coming back as fetch('\u00000\u0000')). Restore
  // repeatedly until stable; bounded by span count as a safety cap.
  let out = String(masked);
  for (let pass = 0; pass <= spans.length; pass++) {
    // eslint-disable-next-line no-control-regex -- \u0000 placeholders are intentional
    const next = out.replace(/\u0000(\d+)\u0000/g, (m, i) => {
      const span = spans[Number(i)];
      return span === undefined ? m : span;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}
