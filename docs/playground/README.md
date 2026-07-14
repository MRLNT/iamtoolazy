# Playground

Static, dependency-free demo of `@iamtoolazy/core` on GitHub Pages.
100% in-browser: no server, no keys, no telemetry — the same zero-network
rule as the extension.

`core.bundle.js` is a committed build artifact. Rebuild it whenever
`packages/core/src/` changes:

```
npx esbuild packages/core/src/index.js --bundle --format=esm \
  --external:gpt-tokenizer/encoding/o200k_base \
  --banner:js="// GENERATED — do not edit. Rebuild: see docs/playground/README.md" \
  --outfile=docs/playground/core.bundle.js
```

The tokenizer is deliberately excluded (same as the extension bundle), so
the in-browser estimator runs in heuristic mode and says so on the page.

Local preview: `python3 -m http.server -d docs` → http://localhost:8000/playground/
