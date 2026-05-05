# Testing Patterns

Use this when the test shape matters more than the basic `testing` skill already covers.

## Test Shape

- Prefer one behavior per test and names that describe the user-visible outcome.
- Keep tests DAMP: repeated setup is acceptable when it makes the behavior obvious.
- Assert outputs, effects, and boundary calls rather than private implementation.
- Use fixtures/builders for domain objects only when direct literals become noisy.
- Avoid broad snapshots unless the snapshot is the contract.

## Boundaries

- Unit tests cover pure logic, parsers, mappers, and query key factories.
- Integration tests cover server functions, API modules, auth/data boundaries, and provider adapters.
- Component tests cover conditional rendering, forms, accessibility states, and interactions.
- E2E tests cover flows that cannot be trusted from isolated tests.

## Regression Tests

- Reproduce the bug first when practical.
- Keep the regression name tied to the user symptom.
- Assert the edge case that failed, not just the happy path.
- Do not weaken or delete existing assertions to fit a fix.

## Mocking

- Mock at stable boundaries: network, filesystem, time, random, external services.
- Do not mock the code under test.
- Prefer realistic provider payloads with irrelevant fields omitted.
- Reset mocks between tests and avoid order-dependent suites.
