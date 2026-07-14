# r/LocalLLaMA draft

**Title:** Open-source client-side prompt compression with committed benchmarks — including the negative results

**Body:**

iamtoolazy: MIT, zero-network, rule-based prompt compression + adaptive
directive injection that runs entirely on-device (browser extension +
Claude Code plugin + tiny npm core). No models to download, no server.

Why this sub might care even though it's not a local model:
- The LAZY method draft is provider-agnostic client-side policy: measure
  your own response lengths (EWMA), inject brevity/budget directives only
  when measured savings beat measured overhead, print every skip reason.
- Benchmarks are reproducible from the repo with one command, offline,
  $0: frozen JSONL workloads (EN+ID), 8 conditions incl. ablations,
  N-repeat protocol with mean±spread and instability flags.
- Negative results are in the tables: directive overhead +52.8% input on
  short prompts (output payback unmeasured so far), and delta-context
  dropped 0 sentences because my workload prompts had no restatement —
  documented as a workload bug, not hidden.

Playground: https://mrlnt.github.io/iamtoolazy/playground/
Repo + paper draft: https://github.com/MRLNT/iamtoolazy

Poke holes in the method — that's what the ablations are for.
