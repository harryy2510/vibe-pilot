---
name: code-simplification
description: "Use when refactoring working code for clarity while preserving behavior, reducing accidental complexity, or consolidating duplication."
---

# Code Simplification

Make working code easier to understand without changing what it does. This skill is inspired by addyosmani/agent-skills and adapted for DotAgent speed mode.

## When to Apply

- A working implementation is too nested, indirect, duplicated, or hard to review.
- Review feedback asks for clearer names, smaller functions, fewer abstractions, or lower cognitive load.
- Multiple nearby code paths solve the same problem differently.
- A migration or feature added temporary complexity that can now be collapsed.

Skip it when the code is already clear, the behavior is not understood, or the user asked for a feature fix rather than cleanup.

## Workflow

1. Understand current behavior from tests, call sites, and surrounding code before editing.
2. Identify the smallest simplification that removes real complexity.
3. Preserve inputs, outputs, side effects, ordering, errors, performance characteristics, and public names unless explicitly changing them.
4. Prefer clearer names, early returns, local helpers, direct data shapes, and established repo patterns.
5. Remove abstractions only when they no longer carry useful policy, reuse, or boundary protection.
6. Run the narrowest check that proves behavior is unchanged.

## Good Simplifications

- Replace nested conditionals with guard clauses.
- Collapse one-use wrappers that hide simple logic.
- Consolidate duplicated validation or mapping logic.
- Convert boolean mode props into explicit variants only when it improves call sites.
- Move comments into clearer names unless the comment explains non-obvious policy.

## Rules

- Do not simplify by making code cleverer.
- Do not combine unrelated cleanup with behavior changes.
- Do not rewrite a module because a smaller local edit would solve the problem.
- Do not delete tests to make a refactor pass.
- Do not "simplify" code by removing edge-case handling.

## Output

- Behavior preserved.
- Complexity removed.
- Tests/checks run.
- Any remaining cleanup intentionally left out of scope.
