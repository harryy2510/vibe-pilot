---
description: Validate skill and agent quality — checks frontmatter, triggers, size, broken references, orphan files, and duplicates.
argument-hint: [skills|agents|path]
---

Run the skill linter:

```bash
if [ -z "${ARGUMENT}" ] || [ "${ARGUMENT}" = "all" ]; then
  echo "=== Skills ===" && bash "${CLAUDE_PLUGIN_ROOT}/scripts/skill-lint.sh" "${CLAUDE_PLUGIN_ROOT}/skills/"
  echo "" && echo "=== Agents ===" && bash "${CLAUDE_PLUGIN_ROOT}/scripts/skill-lint.sh" "${CLAUDE_PLUGIN_ROOT}/agents/"
elif [ "${ARGUMENT}" = "skills" ]; then
  bash "${CLAUDE_PLUGIN_ROOT}/scripts/skill-lint.sh" "${CLAUDE_PLUGIN_ROOT}/skills/"
elif [ "${ARGUMENT}" = "agents" ]; then
  bash "${CLAUDE_PLUGIN_ROOT}/scripts/skill-lint.sh" "${CLAUDE_PLUGIN_ROOT}/agents/"
else
  bash "${CLAUDE_PLUGIN_ROOT}/scripts/skill-lint.sh" "${ARGUMENT}"
fi
```
