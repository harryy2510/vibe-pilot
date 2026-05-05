---
name: testing
description: "Use when writing, reviewing, or running unit tests, integration tests, or E2E tests. Covers Vitest + Testing Library for unit/integration, Playwright for E2E."
---

# Testing

Vitest for unit/integration. Playwright for E2E. Testing Library for component tests.

## When to Apply

- Writing new utility functions, lib helpers, or pure logic
- Adding server functions or API modules
- Building complex UI components with conditional logic
- Reviewing test quality or coverage
- Setting up test infrastructure

## Test-First Loop

For regressions, fragile logic, auth/data boundaries, or behavior with real user impact, prefer RED-GREEN-REFACTOR:

1. Write or adjust a test that fails for the current bug/requirement.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the smallest correct change.
4. Run the focused test until it passes, then refactor with tests green.
5. Broaden to impacted tests/checks before completion.

If test-first is impractical, state why and add the closest useful coverage before shipping.

## File Conventions

- Test files colocated next to source: `foo.ts` -> `foo.test.ts`
- Component tests: `button.test.tsx` next to `button.tsx`
- E2E tests: `e2e/` directory at project root
- File extension: `.test.ts` or `.test.tsx` -- never `.spec.*`
- One describe block per exported function/component

## What to Test

### Always Test (high value)
- Pure utility functions (`libs/`, `api/*/lib/`)
- Zod schemas -- validate correct inputs pass + invalid inputs fail with right errors
- Data transformations -- mappers, formatters, parsers
- Query key factories -- verify key structure
- Complex conditional logic in components

### Test When Complex
- Server functions with branching logic
- Custom hooks with non-trivial state
- Form validation edge cases
- Multi-step flows

### Never Test (waste of tokens)
- Simple pass-through components (just renders children)
- Direct re-exports
- Auto-generated files (database.types.ts, routeTree.gen.ts)
- Styling/layout (visual regression is better)
- React Query hooks that just wrap a server function with no transform

## References

Use `references/testing-patterns.md` when the test shape, mocking boundary, or regression strategy needs more detail than this quick path.

## Vitest Patterns

### Basic Unit Test
```ts
import { describe, expect, it } from 'vitest'

import { formatPrice } from './format-price'

describe('formatPrice', () => {
	it('formats cents to dollars', () => {
		expect(formatPrice(1500)).toBe('$15.00')
	})

	it('handles zero', () => {
		expect(formatPrice(0)).toBe('$0.00')
	})

	it('returns null for negative values', () => {
		expect(formatPrice(-100)).toBeNull()
	})
})
```

### Testing Zod Schemas
```ts
import { describe, expect, it } from 'vitest'

import { createContactSchema } from './schemas'

describe('createContactSchema', () => {
	it('accepts valid input', () => {
		const result = createContactSchema.safeParse({
			email: 'test@example.com',
			firstName: 'John',
			lastName: 'Doe',
		})
		expect(result.success).toBe(true)
	})

	it('rejects invalid email', () => {
		const result = createContactSchema.safeParse({
			email: 'not-an-email',
			firstName: 'John',
			lastName: 'Doe',
		})
		expect(result.success).toBe(false)
	})
})
```

### Testing with Mocks
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { processWebhook } from './webhook-handler'

vi.mock('@/libs/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(() => ({
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({ data: [{ id: '1' }], error: null })),
			})),
		})),
	})),
}))

describe('processWebhook', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('processes valid payload', async () => {
		const result = await processWebhook({ event: 'created', data: {} })
		expect(result).toBeDefined()
	})
})
```

## Rules

- Import `describe`, `expect`, `it`, `vi` from `vitest` -- never from `jest` or globals
- Use `vi.fn()` and `vi.mock()` -- never `jest.fn()`
- Use `beforeEach` with `vi.clearAllMocks()` when using mocks
- Test behavior, not implementation -- assert outputs and side effects, not internal state
- Each `it()` block tests ONE thing -- name describes expected behavior
- Use `toBeNull()` not `toBe(null)`. Use `toBeDefined()` not `not.toBe(undefined)`
- Null over undefined in test expectations -- matches production rule
- No `test()` -- always `it()` inside `describe()`
- No snapshot tests -- they rot fast with AI-generated code
- Keep test data minimal -- only fields relevant to assertion
- Run `bun test` before considering work complete

## Testing Library (Component Tests)

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { SearchInput } from './search-input'

describe('SearchInput', () => {
	it('calls onSearch when user types', async () => {
		const user = userEvent.setup()
		const onSearch = vi.fn()

		render(<SearchInput onSearch={onSearch} />)

		await user.type(screen.getByRole('searchbox'), 'hello')
		expect(onSearch).toHaveBeenCalledWith('hello')
	})
})
```

### Rules
- Query by role first (`getByRole`), then by label (`getByLabelText`), then by text (`getByText`) -- never by test ID unless no semantic alternative
- Use `userEvent` (not `fireEvent`) for user interactions
- `screen` for queries -- never destructure from `render()`
- Wrap state updates in `act()` only if Testing Library doesn't handle it automatically
- No `waitFor` with arbitrary timeouts -- use `findBy*` queries instead

## Playwright (E2E)

E2E tests live in `e2e/` at project root. Page Object Model -- one class per page.
- Use semantic locators (`getByRole`, `getByLabel`) -- never CSS selectors
- `await expect(locator).toBeVisible()` -- never raw `waitForSelector`
- No `page.waitForTimeout()` -- use `expect` with auto-retry or `waitForURL`
- Test user flows, not implementation details
