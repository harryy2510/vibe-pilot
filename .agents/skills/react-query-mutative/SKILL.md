---
name: react-query-mutative
description: "Use when writing React Query mutations with optimistic updates, configuring QueryClient, creating query key factories, or structuring API modules with queries and mutations."
---

## QueryClient Configuration

File: `libs/query/root-provider.tsx`

TanStack Query defaults are intentionally active: cached data is stale by default, stale queries refetch on mount/window focus/reconnect, inactive queries are garbage-collected after 5 minutes, and failures retry 3 times. This stack opts into manual freshness, so be deliberate when changing defaults.

- `staleTime: Infinity` — data never goes stale automatically
- `gcTime: Infinity` — never garbage-collected
- `refetchOnMount: false`
- `refetchOnWindowFocus: false`
- `retry: false`
- Manual freshness control: call `invalidateQueries`, `refetchQueries`, or `setQueryData` in mutation callbacks
- Global `MutationCache.onError` → `toast.error(error.message)` via sonner
- Global `QueryCache.onError` → `toast.error(error.message)` for failed queries

## Query Key Factories

One factory per domain in `api/<domain>/keys.ts`:

```typescript
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (filters: ContactFilters) => [...contactKeys.lists(), filters] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
}
```

## Optimistic Updates via mutative

Use simple UI-level optimistic state when the mutation and list live together. Use cache-level optimistic updates only when multiple components need the pending state or when rollback matters.

File: `libs/query/optimistic.ts`

```typescript
import { create } from 'mutative'

type RollbackFn = () => void

export function optimisticUpdate<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (draft: TData) => void,
): RollbackFn {
  const previous = queryClient.getQueryData<TData>(queryKey)
  if (previous) {
    queryClient.setQueryData(queryKey, create(previous, updater))
  }
  return () => queryClient.setQueryData(queryKey, previous)
}

export function optimisticRemove<TItem>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  predicate: (item: TItem) => boolean,
): RollbackFn {
  return optimisticUpdate<TItem[]>(queryClient, queryKey, (draft) => {
    const idx = draft.findIndex(predicate)
    if (idx !== -1) draft.splice(idx, 1)
  })
}

export function optimisticAdd<TItem>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  item: TItem,
  position: 'start' | 'end' = 'end',
): RollbackFn {
  return optimisticUpdate<TItem[]>(queryClient, queryKey, (draft) => {
    position === 'start' ? draft.unshift(item) : draft.push(item)
  })
}

export function rollback(...fns: RollbackFn[]) {
  return () => fns.forEach((fn) => fn())
}

export function settle(queryClient: QueryClient, queryKeys: QueryKey[]) {
  return () => queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
}
```

## invalidateQueries vs refetchQueries

- **`invalidateQueries`**: Marks queries as stale. They refetch on next mount or access. Use for most mutations where the user stays on the same page.
- **`refetchQueries`**: Immediately re-runs the query, even if no component is mounted for it. Use when the user navigates away after mutating (e.g., create-then-redirect) and the list they return to must already have fresh data.

```typescript
// Create → redirect: use refetchQueries so the list is fresh on back-navigation
onSettled: () => {
  void queryClient.refetchQueries({ queryKey: programKeys.myPrograms() })
}

// Delete on current page: invalidate is enough
onSettled: settle(queryClient, [programKeys.all])
```

## Concurrent Mutation Safety

For builders/editors with rapid successive mutations:

- Use a shared `mutationKey` across related mutations
- Guard with `isMutating()` — skip `setQueryData` unless last pending
- Only call `settle` if `isLastPendingMutation()`
- Always call `router.invalidate()` in `onSettled`

## API Module Pattern

Four files per domain under `api/<domain>/`:

| File | Contents |
|---|---|
| `schemas.ts` | Zod v4 schemas + inferred types |
| `functions.ts` | `createServerFn` handlers |
| `keys.ts` | Query key factories |
| `hooks.ts` | `useQuery` / `useMutation` wrappers |
