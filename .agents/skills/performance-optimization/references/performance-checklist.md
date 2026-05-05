# Performance Checklist

Use this only after a concrete slow path or regression is in scope.

## Frontend

- Measure LCP, CLS, INP, hydration cost, network waterfall, and render count when relevant.
- Check duplicated fetches, serialized awaits, unnecessary client components, and oversized props.
- Review bundle additions, barrel imports, heavy synchronous work, and third-party scripts.
- Verify image dimensions, responsive sources, caching headers, and lazy loading.
- Prefer route-level or interaction-level profiling over guessing from source.

## Backend And API

- Capture endpoint latency, database time, upstream API time, serialization cost, and cold start when relevant.
- Parallelize independent awaits only after confirming they are independent.
- Add caching only with explicit invalidation and privacy boundaries.
- Paginate large reads and avoid returning fields the caller does not use.
- Keep error and retry behavior visible; retries can amplify load.

## Database

- Use `EXPLAIN ANALYZE` or the repo's equivalent for slow queries.
- Check missing indexes, low-selectivity indexes, RLS policy cost, N+1 queries, and unbounded scans.
- Prefer targeted indexes over broad index churn.
- Keep migrations reversible or explain why not.

## Verification

- Compare the same operation before and after.
- Report metric, input size, environment, and command/tool.
- Note whether the improvement is local-only or production-representative.
