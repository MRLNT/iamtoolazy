# r/ClaudeAI draft

**Title:** I benchmarked my own free token-saver extension and I'm leading with the numbers that hurt

**Body:**

Free, open-source, zero-network extension for claude.ai (also
chatgpt/gemini, plus a Claude Code plugin). No accounts, no API keys, no
telemetry — hard rule, an early BYOK feature was removed on purpose.

What it does: compresses your prompt before send (preview diff, Alt+L),
trims context the thread already established, one-click 🧵 Distill to
restart long threads cheaply, image downscale + PDF→text before upload,
and an honest ledger.

What I measured (raw JSONL committed in the repo):
- Distill: −30% of re-sent history per turn on 6–8-turn test threads,
  pays for itself after ~3.4 turns. Real long threads save far more —
  and long threads are where Claude usage limits actually die.
- The uncomfortable one: on short single prompts my injected directives
  COST ~+50 input tokens on average. The payback is supposed to come
  from shorter outputs — not measured yet ($0 benchmark budget), so I
  won't claim it.

Playground (in-browser, nothing leaves the page):
https://mrlnt.github.io/iamtoolazy/playground/
Repo: https://github.com/MRLNT/iamtoolazy

Feedback I'd genuinely value: does the preview diff feel safe enough to
leave on auto? And Indonesian users — half the benchmark workloads are
in Indonesian, tell me if they read like real prompts.
