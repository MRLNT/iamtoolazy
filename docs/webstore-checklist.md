# Chrome Web Store — submission checklist (Fase 3.H)

Maintainer-executed, one sitting (~45 min plus review wait). Everything
that can be drafted in advance is drafted below — copy-paste and go.

## 0. Prerequisites
- [ ] Google account for the developer dashboard
- [ ] One-time **$5** developer registration fee
      (https://chrome.google.com/webstore/devconsole)
- [ ] A green `v0.5.0` release with the CI-built zip attached

## 1. Package
- [ ] Upload the CI zip from the release (built from the tagged commit —
      never a local build; provenance matters)

## 2. Listing copy (drafted — edit freely)

**Name:** `iamtoolazy — honest token saver`

**Short description** (≤132 chars):
`Compress prompts, downscale images, extract PDF text — locally, with
honest numbers. Zero network, zero telemetry. 🐨`

**Detailed description:** start from the repo README "What is this?" +
"What you get" sections, then append:

> Every number is labeled an estimate. Savings that don't exist are
> reported as exactly that — on chatgpt.com, image downscaling is not
> even offered, because OpenAI rescales server-side and a client resize
> saves ~zero. Full privacy policy and threat model are public in the
> repository.

**Category:** Productivity → Developer Tools
**Language:** English

## 3. Screenshots (1280×800, capture on a clean profile)
- [ ] 1. Preview diff overlay on claude.ai (removed / repeated-context /
      protected colors visible)
- [ ] 2. Image downscale pill — the Gemini one is the money shot
      (~3096 → ~258, −92%)
- [ ] 3. PDF→text offer + extracted `--- page N ---` text in composer
      (use a DUMMY pdf — never a real document)
- [ ] 4. Popup: honest ledger + per-site toggle
- [ ] Icon 128×128 (already in `packages/extension/icons/`)

## 4. Privacy tab (answers ready)
- **Single purpose:** reduce LLM token usage on three chat sites via
  local prompt compression and media optimization.
- **Permission justifications:** copy the table from
  `packages/extension/README.md` (§ Permissions) verbatim.
- **Remote code:** none — all code ships in the package (pdf.js is
  bundled, lazy-loaded from the package itself).
- **Data usage:** nothing collected, nothing transmitted. Storage is
  local-only settings + numeric ledger. Link `PRIVACY.md`.
- [ ] Privacy policy URL: `https://github.com/MRLNT/iamtoolazy/blob/main/PRIVACY.md`

## 5. Distribution
- [ ] Visibility: Public
- [ ] Regions: all

## 6. Review notes for the reviewer (paste as-is)
> The extension runs only on claude.ai, chatgpt.com, and
> gemini.google.com. It makes no network requests (no host_permissions;
> verify by grepping the source, which is public at
> github.com/MRLNT/iamtoolazy). pdf.js is bundled and only loads after
> an explicit off-by-default toggle plus a per-file confirmation.

## 7. After approval
- [ ] Update README Door 2: Web Store link becomes the easy way;
      release-zip becomes the fallback
- [ ] CHANGELOG note + tag `v0.5.1` if listing required changes
- [ ] Firefox port stays in `docs/roadmap.md` backlog until requested
