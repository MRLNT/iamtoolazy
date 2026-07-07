# @iamtoolazy/extension — Fase 3

Browser extension (Manifest V3, Chrome/Edge/Brave first) built on
`@iamtoolazy/core`:

- Site adapters: claude.ai, chatgpt.com, gemini.google.com (+ generic fallback)
- Auto mode with preview-diff before send (default on, configurable)
- Media optimizer: image downscale/re-encode before upload; PDF → local text
  extraction (opt-in, with consent — it changes what the AI receives)
- Thread distiller + context health meter
- Onboarding wizard (choose which savings modules to enable), options page,
  BYOK key storage for the optional LLM refine pass, honest stats dashboard

Not implemented yet. Tracked in the root README roadmap.
