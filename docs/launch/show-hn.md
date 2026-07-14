# Show HN draft

**Title (pick one):**
- Show HN: Iamtoolazy – token saver whose own benchmark says its directives cost +52.8% input
- Show HN: An honest token saver – free, zero-network, benchmarked against itself

**Body:**

I built a free, open-source token saver for Claude/ChatGPT/Gemini web chat
(browser extension) and Claude Code (plugin). Then I benchmarked it — and
I'm publishing the uncomfortable parts first.

Measured (input side, offline tokenizer, raw JSONL in the repo):
- On short single prompts, my own injected directives ADD ~50 input tokens
  (+52.8%) on average. A one-line "be brief" costs 12x less. The bet is
  output-side payback, which I have NOT measured yet (run 1 spent $0 on
  APIs) — so I say that instead of implying otherwise.
- The thread distiller is the strongest measured saver: −30% of re-sent
  history per turn on 6–8-turn threads, break-even after ~3.4 turns.
  Longer threads save more.
- The net-positive guard works: it skips prompts where a directive can't
  win — the failure mode independent re-benchmarks found in the viral
  "talk like a caveman" tools shows up in my tables as a measured
  +37–57% input overhead on always-inject conditions.

Everything is free and zero-network by construction (an early BYOK
feature was built, field-tested, and deliberately removed). Ledger shows
estimates labeled as estimates, every skip has a printed reason.

Try it in the browser (no install, nothing leaves the page):
https://mrlnt.github.io/iamtoolazy/playground/
Repo + benchmarks + method draft: https://github.com/MRLNT/iamtoolazy

Solo maintainer from Indonesia; the workloads are EN + Indonesian.
Happy to answer anything, especially "why would you publish numbers that
make your tool look bad" — because the alternative is being caveman.
