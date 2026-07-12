# Threat model — assets, adversaries, mitigations

A browser extension that reads your prompts asks for real trust. This
document says out loud what could go wrong, what we did about it, and
what remains open. It follows a simple frame: what we protect, from
whom, and how.

## Assets

1. **Your prompt text** — sensitive by definition. Prompts contain
   source code, business plans, health questions, legal drafts. We treat
   every prompt as if it were the most sensitive one.
2. **Your files** — images and PDFs you attach. Same assumption.
3. **Your browsing integrity on the three chat sites** — the extension
   must never break sends, lose composer text, or block uploads.
4. **The savings ledger** — low sensitivity by construction (numbers
   only, never text), but still yours.

## Adversaries and scenarios

### A malicious or compromised web page

The content script runs only on three declared origins. A random
malicious site cannot invoke it at all. If one of the three chat sites
itself were compromised, the attacker already has your prompts by
definition — the extension adds no *additional* exposure: it holds no
secrets (no API keys since BYOK was removed), and its storage contains
no prompt text to steal.

Chrome's isolated worlds prevent page scripts from calling into the
content script directly. Our overlays live in closed-off shadow roots;
the only page-facing side effects are composer writes and file-input
rewrites the user explicitly confirmed.

### A malicious PDF

The realistic attack surface in this codebase. Parsing untrusted PDFs
with pdf.js has had real CVEs — notably CVE-2024-4367 (arbitrary JS
execution via crafted fonts during **rendering**). Mitigations, in
layers:

- extraction is **double-gated**: an off-by-default toggle AND a
  per-file confirm — the parser can't even load without two explicit
  user choices;
- we call `getTextContent()` only and **never render pages**, which is
  where the font machinery of CVE-2024-4367 lives;
- `isEvalSupported: false` is set (the documented mitigation), fonts are
  additionally disabled via `disableFontFace: true`;
- the parser runs in-process with pdf.js's fake worker — no worker
  fetches, no remote code;
- guardrails cap what we'll parse locally (25 MB / 300 pages);
- pdfjs-dist is **pinned** (3.11.174) and bundled at build time — no
  CDN, no runtime download.

Open item, tracked honestly: evaluate the pdf.js v4/v5 upgrade (fixes
CVE-2024-4367 at the source). Recorded as tech debt rather than rushed,
because the upgrade changes the worker wiring that we have field-tested.

### A malicious image

Images are decoded by the browser's own `createImageBitmap` — the same
hardened path every `<img>` tag uses — never by third-party parsing
code. A 40 MB size cap keeps decoding from becoming a resource-exhaustion
vector; oversized files pass through untouched.

### Supply chain

- Runtime dependencies of the extension bundle: `@iamtoolazy/core` (this
  repo), `gpt-tokenizer`, and `pdfjs-dist` (pinned, lazy-loaded, consent-
  gated). That's the whole list — small on purpose.
- `package-lock.json` is committed; CI builds from the lockfile.
- No postinstall scripts of our own; `npm audit` runs in development and
  findings are triaged in the open (see the pdf.js note above).

### The extension author (us)

You shouldn't have to trust intentions — verify mechanisms instead:

- zero-network is structural: no `host_permissions`, no fetch calls, and
  the source is auditable in minutes (`grep -rn "fetch(" packages/extension/src/`);
- updates are visible: unpacked installs update only when you pull and
  rebuild; a future Web Store build ships from a tagged, public commit;
- honest numbers are a security property too — the ledger never
  exaggerates, every estimate is labeled, and "no savings" is reported
  as exactly that.

## Permissions rationale (mirrored in the extension README)

| Permission | Why it exists | What it deliberately isn't |
|---|---|---|
| `storage` | settings, ledger, two booleans | no prompt text, ever |
| `activeTab` | popup ↔ current-tab mode toggle | no reading of arbitrary tabs |
| `clipboardWrite` | the preview's **Copy** button | write-only; we never read your clipboard |
| content scripts on 3 chat origins | the entire product | no `<all_urls>`, no other sites |
| `web_accessible_resources`: `dist/pdf-extract.js` | lazy, consent-gated pdf.js load | scoped to the 3 origins only |

## Non-goals

We do not defend against: a compromised browser or OS, other extensions
with broader permissions, or the chat sites' own data handling. Those
are outside any extension's trust boundary — pretending otherwise would
be dishonest, and dishonesty is the one bug this project refuses to ship.
