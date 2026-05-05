---
name: api-and-interface-design
description: "Use when designing or changing APIs, module boundaries, component props, data contracts, server functions, webhooks, or public interfaces."
---

# API And Interface Design

Design boundaries that are stable, boring, and hard to misuse. This skill is inspired by addyosmani/agent-skills and adapted for DotAgent projects.

## When to Apply

- Adding or changing API endpoints, server functions, webhooks, RPCs, SDK functions, or shared modules.
- Defining request/response types, component props, event payloads, or database-backed contracts.
- Touching behavior consumers may already depend on.
- Reviewing inconsistent errors, pagination, filters, auth boundaries, or versioning.

## Workflow

1. Identify the consumers: UI, backend module, public API user, worker, webhook sender, database function, or third-party integration.
2. Write the contract before the implementation: input type, output type, error shape, auth requirements, idempotency, ordering, pagination, and side effects.
3. Preserve observable behavior unless the user explicitly wants a breaking change.
4. Validate at the boundary with the repo's standard parser or schema tool.
5. Use one error strategy per surface: thrown domain errors, typed result objects, HTTP problem body, or framework-standard response helpers.
6. Make optional fields intentional. Distinguish omitted, null, empty, and defaulted values.
7. Add focused contract tests for parsing, success, permission failure, validation failure, and the main conflict/not-found case.

## Contract Checklist

- Naming matches the existing domain language.
- IDs, timestamps, enum values, pagination cursors, and sorting are explicit.
- Error codes are machine-readable and stable.
- Server-generated fields cannot be set by clients.
- Destructive actions are idempotent or clearly non-idempotent.
- Auth and tenant scope are enforced at the server/data boundary.
- Public changes have migration or deprecation notes when needed.

## Rules

- Do not leak implementation tables, provider names, stack traces, or internal status into public contracts.
- Do not return multiple shapes for the same operation.
- Do not add a v2 endpoint or parallel function unless extension cannot work.
- Do not silently change ordering, filtering, casing, nullability, or error text on public surfaces.

## Output

- Contract summary.
- Compatibility notes and breaking-change risk.
- Validation and error strategy.
- Focused tests/checks run.
