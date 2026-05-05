---
name: performance-optimization
description: "Use when diagnosing slow pages, APIs, builds, queries, bundles, memory usage, Core Web Vitals, or suspected performance regressions."
---

# Performance Optimization

Measure first, change the bottleneck, and verify the same metric improved. This skill is inspired by addyosmani/agent-skills and adapted for DotAgent speed mode.

## When to Apply

- The user reports slowness, high latency, large bundles, memory pressure, query timeouts, slow builds, or bad Core Web Vitals.
- A change touches hot paths, data loading, rendering, caching, pagination, indexing, or worker startup.
- Performance is part of release readiness.

## Workflow

1. Define the metric: latency, throughput, query time, bundle size, render count, memory, CPU, cold start, LCP, CLS, INP, or build time.
2. Capture a baseline with the smallest reliable tool available.
3. Localize the bottleneck before editing: network, database, server, client render, bundle, assets, cache, or tooling.
4. Make one targeted change.
5. Re-measure the same metric under similar conditions.
6. Add a guard when regression risk is high: test, budget, query plan note, benchmark, or monitoring hook.

## References

- Use `references/performance-checklist.md` for a compact triage checklist.
- Use `react-best-practices` for React rendering, waterfalls, and bundle work.
- Use `supabase-postgres-best-practices` for query plans, indexes, and database latency.
- Use `vite` for build, SSR, and bundling issues.
- Use `cloudflare` for Workers runtime and deployment behavior.

## Rules

- Do not optimize before identifying a bottleneck.
- Do not add memoization, caching, indexes, or concurrency without a reason and invalidation story.
- Do not hide slow work behind spinners if the user asked for speed.
- Do not compare before/after metrics from different inputs or environments without saying so.
- Prefer deleting unnecessary work over adding infrastructure.

## Output

- Baseline metric.
- Bottleneck found.
- Optimization made.
- After metric and remaining risk.
