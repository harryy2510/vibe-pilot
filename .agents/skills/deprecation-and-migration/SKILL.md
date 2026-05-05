---
name: deprecation-and-migration
description: "Use when replacing old behavior, migrating data or APIs, removing legacy code, changing public contracts, or planning safe cleanup."
---

# Deprecation And Migration

Remove or replace old systems deliberately. This skill is inspired by addyosmani/agent-skills and adapted for DotAgent's preference for direct replacement before launch and disciplined migration after users exist.

## When to Apply

- Removing stale helpers, fallback paths, generated scaffolds, old commands, deprecated APIs, or duplicate systems.
- Migrating data, config, routes, package names, plugin metadata, docs, or public contracts.
- Replacing a shipped behavior with a new behavior.
- The user says "cleanup legacy", "migrate", "rename across repos", "deprecate", or "we did not ship yet".

## Workflow

1. Classify the state:
   - Not shipped: replace directly and delete old paths.
   - Internal users only: migrate with a short compatibility window if needed.
   - External users: preserve compatibility, document deprecation, and add removal criteria.
2. Inventory every entry point: imports, routes, commands, docs, manifests, generated outputs, tests, CI, hooks, and examples.
3. Choose the migration strategy: direct replacement, adapter, codemod, data migration, redirect, feature flag, or two-step rollout.
4. Update the source of truth first, then generated or derived surfaces through their owning tool.
5. Add tests or checks that prove the new path works and the stale path is gone or intentionally redirected.
6. Record rollback only when the change is shipped or risky; do not preserve dead code as a rollback plan.

## Rules

- If the user says the feature has not shipped, do not add compatibility branches by default.
- Do not leave both old and new names active unless there is a real consumer migration need.
- Do not edit generated files by hand.
- Do not turn cleanup into a broad refactor unrelated to the named legacy surface.
- For database changes, use real migrations and generated types when the repo provides them.

## Output

- Migration classification.
- Surfaces changed and stale surfaces removed.
- Compatibility or rollback notes.
- Focused verification commands/results.
