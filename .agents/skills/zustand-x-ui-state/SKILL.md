---
name: zustand-x-ui-state
description: "Use when managing client-side UI state (sidebars, modals, filters, tabs, theme) in React. Use when deciding where state belongs between zustand-x and React Query. Use when creating or modifying zustand-x stores."
---

# zustand-x v6 for UI State

zustand-x manages **client-side UI state only**. Never server data.

**Package**: `zustand-x` (v6+) — import from `zustand-x`, NOT `@zustand-x/core`.

## Boundary Rule

| Source | Manager |
|---|---|
| API / Supabase data | React Query |
| Client UI state (sidebar, modals, filters, tabs, theme) | zustand-x |
| Form state | react-hook-form |
| URL-persisted state | TanStack Router search params |

## Store Creation (v6 API)

```typescript
import { createStore } from 'zustand-x'

export const uiStore = createStore(
  {
    sidebar: { open: true },
    modals: { activeModal: null as string | null, data: {} as Record<string, unknown> },
    filters: {} as Record<string, unknown>,
    theme: getInitialTheme(), // reads localStorage + prefers-color-scheme
  },
  { name: 'ui', mutative: true },
)
```

### Extending with Selectors and Actions

```typescript
const extendedStore = uiStore
  .extendSelectors(({ get }) => ({
    isSidebarOpen: () => get('sidebar').open,
    isDarkMode: () => get('theme').resolved === 'dark',
  }))
  .extendActions(({ set }) => ({
    toggleSidebar: () => set('sidebar', (prev) => ({ open: !prev.open })),
    setThemeMode: (mode: ThemeMode) => {
      // resolve mode, persist to localStorage, apply class to documentElement
    },
  }))
```

## Theme System

3-layer approach — no flash of wrong theme on SSR:

1. **SSR blocking script** in `<head>` — runs before paint, reads localStorage, applies `.dark`/`.light` class + `colorScheme`.
2. **zustand-x store** takes over after hydration. `setThemeMode` action resolves, persists, applies class.
3. **System preference listener** — when `mode === 'auto'`, listen to `matchMedia` changes and update `theme.resolved`.

ThemeMode type: `'auto' | 'dark' | 'light'`. Store shape: `{ mode: ThemeMode, resolved: 'dark' | 'light' }`.

## v6 API — Reading & Writing State

```typescript
import { useStoreValue, useStoreState, useTracked } from 'zustand-x'

// ── Reading in components ──
const sidebar = useStoreValue(uiStore, 'sidebar')        // single field
const isDark = useStoreValue(extendedStore, 'isDarkMode') // selector
const [sidebar, setSidebar] = useStoreState(uiStore, 'sidebar') // value + setter
const theme = useTracked(uiStore, 'theme')                // proxy-based minimal re-renders

// ── Reading outside components ──
uiStore.get('sidebar')
extendedStore.get('isDarkMode')

// ── Writing ──
uiStore.set('sidebar', { open: false })
extendedStore.set('toggleSidebar')
extendedStore.set('setThemeMode', 'dark')

// ── Batch update with mutative ──
uiStore.set('state', (draft) => {
  draft.sidebar.open = false
  draft.modals.activeModal = null
  return draft
})
```

## What belongs in zustand-x

Sidebar open/closed, active modal + data, active tabs, filter state, theme mode. Any transient UI state.

## What does NOT belong

User session/auth (React Query), database records (React Query), form state (react-hook-form), URL state (router search params).

## Rules

- One store file per concern (`ui-store.ts` for general UI).
- Use `useStoreValue(store, 'field')` to read in components.
- Use `useTracked(store, 'field')` only for proxy-based tracking on deeply nested objects.
- Never put server data in stores.
- Prefer URL search params over zustand for state that should survive page refresh.
- Theme is the exception — persisted to localStorage, not URL params.
