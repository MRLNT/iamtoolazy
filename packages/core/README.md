# @iamtoolazy/core

The engine behind [iamtoolazy](https://github.com/MRLNT/iamtoolazy):
input-side prompt compression, PCTF refinement, adaptive terse/YAGNI/CoD
directives with TALE-style budgets, delta-context compression, and
on-device LAZY calibration. Runs in Node ≥18 and the browser. Zero
dependencies at runtime except an optional tokenizer.

```js
import { processPrompt, initTokenizer } from '@iamtoolazy/core';
await initTokenizer(); // optional: real counts instead of chars/4
const r = processPrompt('Hi! Could you please fix this bug? Thanks!!');
r.output; r.tokens.predictedNet; r.injection.reason;
```

Full docs, honest-numbers policy, and the LAZY method paper live in the
[main repository](https://github.com/MRLNT/iamtoolazy).
