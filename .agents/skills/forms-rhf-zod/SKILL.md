---
name: forms-rhf-zod
description: "Use when creating or editing forms with react-hook-form, zod schemas, form validation, useForm, useWatch, zodResolver, zod-empty init(), multi-step forms, or server-side input validation."
---

## Stack

react-hook-form + zod v4 + zod-empty + @hookform/resolvers

## Schema Patterns

Schemas live in `api/<domain>/schemas.ts`. Use zod v4 shorthand and `{ error: '...' }` syntax.

```typescript
import { z } from 'zod/v4'

export const loginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
})
export type LoginInput = z.infer<typeof loginSchema>
```

- Use `z.email()`, `z.uuid()`, `z.url()` -- NOT `z.string().email()`
- Error syntax: `{ error: '...' }` -- NOT `{ message: '...' }`
- Types inferred from schemas: `type X = z.infer<typeof xSchema>`
- Every field gets a descriptive error message
- Use `safeParse()` / `safeParseAsync()` at trust boundaries when you need a typed result instead of throwing.
- Do not enable `reportInput` for user input unless you are certain sensitive data cannot be logged.

## Form Initialization

```typescript
import { init } from 'zod-empty'
import { zodResolver } from '@hookform/resolvers/zod'

// Create mode: ALWAYS use init() for defaults
const form = useForm<LoginInput>({
  defaultValues: init(loginSchema),
  resolver: zodResolver(loginSchema),
})

// Edit mode: init() for defaultValues, actual data via values
const form = useForm({
  defaultValues: init(schema),
  values: existingData,  // re-syncs on every render
  resolver: zodResolver(schema),
})
```

## zodFormResolver Wrapper

Located in `libs/form.ts`. Wraps `zodResolver()` to handle `z.coerce` schemas correctly. Use it instead of raw `zodResolver` when coerce schemas are involved.

## Field Watching

Use `useWatch()` for render subscriptions because it isolates re-renders at the hook level. Avoid `form.watch()` in components that render frequently.

```typescript
// Inside <Form> (FormProvider): no control needed
const selectedRole = useWatch({ name: 'role' })

// Outside <Form>: must pass control explicitly
const selectedRole = useWatch({ control: form.control, name: 'role' })
```

## Multi-Step Forms

Use a `step` field with optional step sub-schemas:

```typescript
export const upsertProfileSchema = z.object({
  step: z.coerce.number().int().min(0).max(4),
  step1: step1Schema.optional(),
  step2: step2Schema.optional(),
})
```

## Server-Side Validation

Use `.inputValidator(schema)` on `createServerFn` -- NEVER `.validator()`.

```typescript
const myServerFn = createServerFn({ method: 'POST' })
  .inputValidator(loginSchema)
  .handler(async ({ input }) => {
    // input is typed as LoginInput
  })
```
