---
name: debugging
description: "Use when investigating bugs, crashes, flaky tests, regressions, production incidents, timing issues, root-cause analysis, or verifying a fix actually addresses the original symptom."
---

# Debugging

Debug systematically. Do not patch symptoms or guess from the first stack trace.

## Workflow

1. Reproduce or capture the symptom: command, input, environment, expected, actual.
2. Gather evidence: logs, stack trace, failing test, screenshot/trace, recent diff, recent commits, related issues.
3. Isolate the boundary: caller, state, data, network, database, cache, time, auth, permissions, or UI.
4. Form one hypothesis at a time and test it with the smallest probe.
5. Fix the root cause, not the observed side effect.
6. Add or update a regression test when behavior should stay fixed.
7. Re-run the original reproduction plus impacted checks before claiming success.

## Rules

- Prefer a failing test or deterministic reproduction before editing.
- Check recent changes and high-churn files before blaming stable code.
- Change one variable at a time; keep notes on what each probe proves.
- For flaky/timing bugs, replace sleeps with condition-based waits, events, or explicit state checks.
- For incidents, preserve evidence and prefer rollback/restoration first when a known-good release exists.
- Do not weaken assertions, delete tests, ignore errors, silence logs, or disable safety controls to make failures disappear.
- If the bug cannot be reproduced, report confidence, attempted probes, remaining theories, and the next observable signal needed.

## Output

- Symptom and reproduction.
- Root cause with evidence.
- Fix summary and regression coverage.
- Verification commands/results and residual risk.
