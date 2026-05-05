---
title: Set search_path on SQL Functions
impact: HIGH
impactDescription: Prevents search_path injection attacks on mutable functions
tags: security, search-path, functions, injection
---

## Set search_path on SQL Functions

SQL functions without an explicit `search_path` inherit the caller's path, which can be manipulated to redirect function calls to attacker-controlled schemas. This is especially dangerous for `SECURITY DEFINER` functions but applies to all mutable functions.

**Incorrect (inherits caller's search_path):**

```sql
create or replace function public.get_user_data(p_user_id uuid)
returns setof public.users
language sql
stable
as $$
  select * from users where id = p_user_id;
$$;
```

**Correct (explicit search_path):**

```sql
create or replace function public.get_user_data(p_user_id uuid)
returns setof public.users
language sql
stable
set search_path = ''
as $$
  select * from public.users where id = p_user_id;
$$;
```

When using `SET search_path = ''`, qualify all table and type references with their schema (`public.users`, `auth.uid()`).

Alternative approach for functions that reference many tables:

```sql
create or replace function public.complex_query()
returns void
language plpgsql
volatile
set search_path = 'public, extensions'
as $$
begin
  -- Tables resolve to public schema, extension functions to extensions
end;
$$;
```

### Rules

- All `SECURITY DEFINER` functions MUST set `search_path`
- All `VOLATILE` (mutable) functions SHOULD set `search_path`
- `STABLE` and `IMMUTABLE` functions are lower risk but still benefit from explicit paths
- When using `SET search_path = ''`, every table/function reference must be schema-qualified
- Supabase Linter flags functions missing `search_path` -- fix them proactively

Reference: [PostgreSQL SET search_path](https://www.postgresql.org/docs/current/sql-createfunction.html)
