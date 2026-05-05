---
name: tanstack-start-cloudflare
description: "Use when building routes, layouts, breadcrumbs, server functions, error handling, metadata, or deployment config in a TanStack Start app deployed to Cloudflare Workers."
---

## Routing

File-based routing via TanStack Router. Router context type: `{ queryClient, session, user }`.

`getRouter()` must create a new router instance per request/session. Do not import a singleton router into server code.

Root `beforeLoad` primes auth via `ensureQueryData`. Route loaders prime cache with `ensureQueryData`, components read via `useQuery()` — NEVER `useLoaderData()`.

Links: `<Link to="/items/$id" params={{ id }} search={{ tab: 'details' }} />` — never template strings.

Never run TanStack Router CLI generation manually — `bun run dev` generates the route tree automatically.

## Layouts

Two layout routes:

1. **`_auth.tsx`** — guest-only. Redirects to `/dashboard` if logged in. Renders `<AuthLayout />` (centered card, no chrome).
2. **`_authed.tsx`** — protected. Redirects to `/login?redirect=current` if not logged in. Renders `<AppSidebar />` + `<AppTopBar />` with breadcrumbs.

Layout components live in `src/components/app/`: `app-sidebar.tsx`, `app-topbar.tsx`, `auth-layout.tsx`.

## Breadcrumbs

No `useEffect`, no global state. Routes declare breadcrumbs in `staticData`. Dynamic labels via `routeContext` in `beforeLoad`.

```tsx
// Route definition with breadcrumb
export const Route = createFileRoute('/_authed/projects/$id')({
  staticData: { breadcrumb: 'Project Details' },
  beforeLoad: async ({ context, params }) => {
    const project = await context.queryClient.ensureQueryData(projectQueryOptions(params.id))
    return { breadcrumb: project.name }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(projectQueryOptions(params.id)),
})
```

```tsx
// useBreadcrumbs hook
function useBreadcrumbs() {
  const matches = useMatches()
  return matches
    .filter((m) => m.staticData?.breadcrumb || m.context?.breadcrumb)
    .map((m) => ({
      label: m.context?.breadcrumb ?? m.staticData.breadcrumb,
      path: m.pathname,
    }))
}
```

`<Breadcrumbs />` renders inside `AppTopBar` automatically.

## Metadata & Head

Root route sets defaults: charset, viewport, title, description, theme-color, favicon links, manifest. Per-route title overrides via `head` function. Static assets in `public/`: `favicon.ico`, `icon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest`.

## Server Functions

Server functions are callable across the network boundary. Treat every input as untrusted even when a route guard exists.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getItems = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ cursor: z.string().optional() }))
  .handler(async ({ input }) => {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.from('items').select('*')
    if (error) throw error
    return data
  })
```

- Input validation: `.inputValidator(schema)` — NEVER `.validator()`.
- Errors: `throw new Error(message)` — caught by global `MutationCache` → toast.
- Route guards improve UX, not security. Sensitive server functions must enforce authorization through Supabase RLS, scoped queries, or explicit server-side session/role checks.
- Do not duplicate auth checks only when a shared server helper already proves the same invariant and RLS still protects the table.
- Always use `getSupabaseServerClient()` — never `createClient()` or the browser client.

## Error Handling

- Route-level `errorComponent` on layout routes (`_authed.tsx`, `_auth.tsx`).
- Global `notFoundComponent` on root route.
- Per-route `errorComponent` overrides as needed.

## Vite Config

```ts
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
})
```

NEVER use `app.config.ts` or vinxi.

## Deployment

Cloudflare Workers only (not Pages). Config in `wrangler.jsonc`. Deploy scripts live in CI — not in package.json.
