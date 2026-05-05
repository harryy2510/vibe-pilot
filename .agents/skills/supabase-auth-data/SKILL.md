---
name: supabase-auth-data
description: "Use when working with Supabase clients, authentication, database types, migrations, RLS, or environment variables in any framework (TanStack Start, Next.js, etc.)."
---

## Supabase Clients

| Client | File | Scope | RLS | Use For |
|--------|------|-------|-----|---------|
| `getSupabaseServerClient()` | `libs/supabase/server.ts` | Server functions | Yes | All data fetching & mutations |
| `getSupabaseBrowserClient()` | `libs/supabase/client.ts` | Client (singleton) | Yes | `onAuthStateChange` + `refreshSession` ONLY |
| `getSupabaseAdminClient()` | `libs/supabase/admin.ts` | Server functions | No | Cross-user reads, admin ops |

- **Server**: uses `@supabase/ssr` for cookie handling in SSR context.
- **Browser**: singleton pattern, custom storage key. NEVER use for data fetching — use React Query + server functions instead.
- **Admin**: reads `SUPABASE_SECRET_KEY` from Cloudflare env bindings (not `process.env`).

## Auth Flow

1. **Provider**: Supabase Auth — email/password + OAuth (Google, etc.).
2. **Listener**: `onAuthStateChange` mounted once in root shell; syncs React Query cache on `SIGNED_IN`, `TOKEN_REFRESHED`, `SIGNED_OUT`.
3. **Route guards** via `beforeLoad`:
   - `_auth` layout (guest routes) — redirects logged-in users away.
   - `_authed` layout (protected routes) — redirects guests to login with `?redirect=`.
4. **Session priming**: session + user fetched in root `beforeLoad` via `ensureQueryData`.

## Types & Migrations

- `src/types/database.types.ts` — auto-generated via `bun types:db`. **NEVER edit.**
- `worker-configuration.d.ts` — auto-generated. **NEVER edit.**
- Migrations in `supabase/migrations/` — **IMMUTABLE once created.** Always create new files.
- Apply migrations: `bun db:push` (package.json script wrapping supabase CLI).
- **NEVER run direct SQL** (`psql`, `supabase db execute`).

### `.overrideTypes<T>()` for new/incomplete types

```ts
// Merge mode (default) — adds fields to inferred type
.overrideTypes<Array<{ extra_field: string }>>()

// Replace mode — fully replaces inferred type
.overrideTypes<Array<MyType>, { merge: false }>()

// For .single() / .maybeSingle() — use object type, not Array
.overrideTypes<{ id: string; name: string }>()
```

## Environment Variables

Env files are user-owned. Never edit, create, encrypt, decrypt, stage, or commit files whose names start with `.env`; tell the user exactly which variables to set.

| Variable | Context | Purpose |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Client (public) | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client (public) | Anon key |
| `VITE_SITE_URL` | Client (public) | OAuth redirect URL |
| `SUPABASE_SECRET_KEY` | Cloudflare env binding | Admin client service key |
| `SUPABASE_PROJECT_ID` | Script only | CLI / sync-env |
| `SUPABASE_ACCESS_TOKEN` | Script only | CLI auth |
| `SUPABASE_DB_URL` | Local only | Direct DB connection |

- `VITE_` prefix = exposed to client via `import.meta.env`.
- Server secrets = Cloudflare env bindings (not `process.env`).
- Per-environment values usually live in user-managed `.env*` files or deployment secrets. Do not modify them directly.
- For CI/deploy, prefer existing package scripts or documented secret stores over direct Supabase CLI commands.

## Edge Function Patterns

### Shared modules

Place shared utilities in `supabase/functions/_shared/`. Functions import with relative paths:

```typescript
// supabase/functions/_shared/constants.ts
export const NOREPLY_EMAIL = 'noreply@example.com'
export async function sendEmail(params: { html: string; subject: string; to: string | string[] }) {
  // shared utility
}

// supabase/functions/send-email/index.ts
import { sendEmail } from '../_shared/constants.ts'
```

### Calling Edge Functions vs calling from Edge Functions

- **Client/server code calling an Edge Function**: always use `supabase.functions.invoke()` -- never raw `fetch`/`axios`. Exception: streaming responses where `invoke()` doesn't support streaming.
- **Edge Function calling external APIs**: use `fetch` directly (Deno runtime). This is the normal way to reach third-party services (email APIs, webhooks, etc.) from within a function.

## Rules

- Database types are single source of truth — never hand-roll types duplicating DB columns.
- All DB changes through migration files only.
- Executed migrations are immutable — never edit, only create new ones.
