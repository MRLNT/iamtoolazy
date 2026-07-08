---
description: Compress a memory file (default CLAUDE.md) to telegraphic style — every fact kept, every filler dropped
argument-hint: "[path to file, default ./CLAUDE.md]"
---
Target file: $ARGUMENTS (if empty, use ./CLAUDE.md). Then:

1. Read the file. If it does not exist, say so and stop.
2. Copy it to `<file>.bak` (never overwrite an existing .bak — use .bak2).
3. Rewrite the file in telegraphic style: drop articles, pleasantries,
   filler, and redundancy. KEEP byte-for-byte: every rule, constraint,
   path, command, URL, code block, and negation ("never", "don't",
   "jangan"). Keep the original language — never translate. Keep headings.
4. Save, then report exactly: `<file>: <before chars> → <after chars>
   (-<percent>%) · backup: <file>.bak` and nothing else.

The compressed file must be functionally identical for an agent reading
it — if losing a nuance is even possible, keep the original wording.
