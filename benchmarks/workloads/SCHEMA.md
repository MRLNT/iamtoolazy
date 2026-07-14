# Workload Schema

One JSONL file per `{class}-{lang}` pair. One JSON object per line. All
workloads are authored by the maintainer (with AI drafting assistance),
reviewed for realism, and frozen before any benchmark run — results are
only comparable across conditions if the inputs never move.

Files:

```
coding-{en,id}.jsonl      10 records each  (single-turn)
reasoning-{en,id}.jsonl   10 records each  (single-turn)
qa-{en,id}.jsonl          10 records each  (single-turn)
writing-{en,id}.jsonl     10 records each  (single-turn)
history-{en,id}.jsonl      3 records each  (multi-turn)
```

## Single-turn record

```json
{
  "id": "coding-en-01",
  "class": "coding",
  "lang": "en",
  "prompt": "…the exact text a user would type…",
  "tags": ["verbose", "code"],
  "notes": "optional, free-form authoring notes"
}
```

- `id` — globally unique, pattern `{class}-{lang}-NN` (zero-padded).
- `class` / `lang` — must match the filename.
- `prompt` — verbatim user text, 1–6000 chars. Prompts deliberately vary
  in verbosity: most carry realistic filler (the compression target), and
  each file includes at least two already-terse prompts, because the
  net-positive guard is *supposed* to skip those — a workload where every
  prompt is compressible would flatter the tool.
- `tags` — optional analysis labels. Current vocabulary: `verbose`,
  `medium`, `terse`, `code`, `url`, `numbers`. Labels are the author's
  judgment, not measurements.

## Multi-turn (history) record

```json
{
  "id": "history-en-01",
  "class": "history",
  "lang": "en",
  "turns": [
    {"role": "user", "content": "…"},
    {"role": "assistant", "content": "…"}
  ],
  "final_prompt": "…the next user message the conditions transform…",
  "probes": [
    {"id": "p1", "question": "…", "expected": "…", "source_turn": 0}
  ]
}
```

- `turns` — ≥6 entries, alternating roles, starting with `user`.
  Assistant turns are realistic but compact; they exist to establish
  facts, not to model any particular provider's style.
- `final_prompt` — the message each history condition (full history /
  distilled / delta-context) sends next.
- `probes` — ≥2 per record. Each probe asks about a fact established in
  an early turn (`source_turn` is the index into `turns` where the fact
  appears). After a condition's run, probes are asked and the answer is
  compared against `expected` (short canonical form). A probe whose
  verdict flips across the N repeat runs is flagged **unstable** in the
  report rather than counted either way.

## Language policy

EN and ID sets are **independent but analogous** — matched in style,
difficulty, and verbosity mix, but not translations of each other.
Translationese would make the ID set unrealistically clean; real
Indonesian prompts mix registers and borrow English technical terms, and
the workloads reflect that.

## Content rules

- No real personal data, no copyrighted text, no live credentials.
  URLs are `example.com`-style or public documentation roots.
- Prompts must be self-contained: a model with no other context should
  be able to attempt every single-turn prompt.
- Once a benchmark run has been published, records are append-only:
  fixing a workload means adding a new id, never editing a used one.
