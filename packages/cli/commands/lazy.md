---
description: Toggle iamtoolazy or set its intensity (on | off | lite | full | ultra | status)
argument-hint: "[on|off|lite|full|ultra|status]"
---
Run this exact command with the Bash tool and show its output to the user:

```
node "${CLAUDE_PLUGIN_ROOT}/hooks/lazy-config.mjs" $ARGUMENTS
```

Then, in one short line, confirm the current state. If the argument was
`off`, stop applying iamtoolazy response conventions for the rest of the
session. If `on` or an intensity level, apply the conventions from the
`lazy` skill at that level. Do not add any further commentary.
