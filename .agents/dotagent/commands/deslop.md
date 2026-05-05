---
description: Scan the codebase for AI-generated slop patterns (debug statements, placeholders, hardcoded secrets, empty catches).
argument-hint: [path|--staged]
---

Run the deslop scanner:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/deslop.sh" ${ARGUMENT:-.}
```

If critical issues found, list each one and suggest fixes. Never auto-fix secrets — only flag them.
