---
description: Rewrite a prompt into PCTF (Persona, Context, Task, Constraints, Format) before you spend tokens on it
argument-hint: "<the prompt to refine>"
---
Rewrite the prompt in $ARGUMENTS into this exact structure, in the same
language it was written in. Extract only what is present or clearly
implied — invent nothing. Omit lines with no content. Be terse.

You are <persona, only if stated>.
Task: ...
Context: ...
Constraints: ...
Format: ...

Output ONLY the rewritten prompt in a code block, followed by one line:
`tokens: <rough before> → <rough after> (estimates)`. No other text.
