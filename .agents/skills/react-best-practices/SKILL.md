---
name: react-best-practices
description: "React performance optimization and composition patterns. Use when writing, reviewing, or refactoring React components, optimizing bundle size, eliminating waterfalls, designing component APIs, or working with compound components and context providers."
---

# React Best Practices

57 performance rules + composition patterns for React applications.

## Current React Assumptions

- Prefer official React docs over memory for new APIs.
- React Compiler can apply memo-equivalent optimizations; do not add `memo`, `useMemo`, or `useCallback` by habit.
- Use manual memoization only for measured bottlenecks, referential stability required by an API, or expensive calculations.
- Keep effects for synchronization with external systems. Derive render state during render and move interaction logic into event handlers.

## Performance Rules by Priority

### 1. Eliminating Waterfalls (CRITICAL)

- `async-defer-await` — Move await into branches where actually used
- `async-parallel` — Use `Promise.all()` for independent operations
- `async-dependencies` — Use `better-all` for partial dependencies
- `async-suspense-boundaries` — Use Suspense to stream content

### 2. Bundle Size (CRITICAL)

- `bundle-barrel-imports` — Import directly, avoid barrel files
- `bundle-dynamic-imports` — Lazy-load heavy components
- `bundle-defer-third-party` — Load analytics/logging after hydration
- `bundle-conditional` — Load modules only when feature is activated
- `bundle-preload` — Preload on hover/focus for perceived speed

### 3. Server-Side Performance (HIGH)

- `server-cache-react` — Use `cache()` (from react) for per-request dedup
- `server-dedup-props` — Avoid duplicate serialization in RSC props
- `server-serialization` — Minimize data passed to client components
- `server-parallel-fetching` — Restructure components to parallelize fetches

### 4. Client-Side Data Fetching (MEDIUM-HIGH)

- `client-swr-dedup` — Use SWR/React Query for automatic request dedup
- `client-passive-event-listeners` — Use passive listeners for scroll
- `client-localstorage-schema` — Version and minimize localStorage data

### 5. Re-render Optimization (MEDIUM)

- `rerender-defer-reads` — Don't subscribe to state only used in callbacks
- `rerender-memo` — Extract expensive work into memoized components
- `rerender-memo-with-default-value` — Hoist default non-primitive props
- `rerender-dependencies` — Use primitive dependencies in effects
- `rerender-derived-state` — Subscribe to derived booleans, not raw values
- `rerender-derived-state-no-effect` — Derive state during render, not effects
- `rerender-functional-setstate` — Use functional setState for stable callbacks
- `rerender-lazy-state-init` — Pass function to useState for expensive values
- `rerender-simple-expression-in-memo` — Avoid memo for simple primitives
- `rerender-move-effect-to-event` — Put interaction logic in event handlers
- `rerender-transitions` — Use `startTransition` for non-urgent updates
- `rerender-use-ref-transient-values` — Use refs for transient frequent values

### 6. Rendering Performance (MEDIUM)

- `rendering-content-visibility` — Use `content-visibility` for long lists
- `rendering-hoist-jsx` — Extract static JSX outside components
- `rendering-conditional-render` — Use ternary, not `&&` for conditionals
- `rendering-usetransition-loading` — Prefer `useTransition` for loading state

### 7. JavaScript Performance (LOW-MEDIUM)

- `js-batch-dom-css` — Group CSS changes via classes or cssText
- `js-index-maps` — Build Map for repeated lookups
- `js-cache-property-access` — Cache object properties in loops
- `js-combine-iterations` — Combine multiple filter/map into one loop
- `js-set-map-lookups` — Use Set/Map for O(1) lookups
- `js-early-exit` — Return early from functions
- `js-tosorted-immutable` — Use `toSorted()` for immutability

### 8. Advanced Patterns (LOW)

- `advanced-event-handler-refs` — Store event handlers in refs
- `advanced-init-once` — Initialize app once per app load
- `advanced-use-latest` — `useLatest` for stable callback refs

---

## Composition Patterns

### 1. Component Architecture (HIGH)

**Avoid boolean prop proliferation** — don't add booleans to customize behavior. Use composition instead:

```tsx
// ❌ Boolean props
<Card isCompact isHighlighted hasBorder />

// ✅ Composition
<Card variant="highlighted">
  <CompactContent />
</Card>
```

**Compound components** — structure complex UIs with shared context:

```tsx
<Select>
  <SelectTrigger />
  <SelectContent>
    <SelectItem value="a">A</SelectItem>
  </SelectContent>
</Select>
```

### 2. State Management (MEDIUM)

- **Decouple implementation** — Provider is the only place that knows how state is managed
- **Context interface** — Define generic interface with `state`, `actions`, `meta` for dependency injection
- **Lift state** — Move state into provider components for sibling access

### 3. Implementation Patterns (MEDIUM)

- **Explicit variants** — Create explicit variant components instead of boolean modes
- **Children over render props** — Use `children` for composition instead of `renderX` props

### 4. React 19 APIs

- No `forwardRef` — ref is a regular prop
- Use `use()` instead of `useContext()`
