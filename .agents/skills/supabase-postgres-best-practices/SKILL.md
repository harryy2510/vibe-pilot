---
name: supabase-postgres-best-practices
description: Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.
license: MIT
metadata:
  author: supabase
  version: "1.1.0"
  organization: Supabase
  date: January 2026
  abstract: Comprehensive Postgres performance optimization guide for developers using Supabase and Postgres. Contains performance rules across 8 categories, prioritized by impact from critical (query performance, connection management) to incremental (advanced features). Each rule includes detailed explanations, incorrect vs. correct SQL examples, query plan analysis, and specific performance metrics to guide automated optimization and code generation.
---

# Supabase Postgres Best Practices

Comprehensive performance optimization guide for Postgres, maintained by Supabase. Contains rules across 8 categories, prioritized by impact to guide automated query optimization and schema design.

## When to Apply

Reference these guidelines when:
- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling
- Optimizing for Postgres-specific features
- Working with Row-Level Security (RLS)

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Query Performance | CRITICAL | `query-` |
| 2 | Connection Management | CRITICAL | `conn-` |
| 3 | Security & RLS | CRITICAL | `security-` |
| 4 | Schema Design | HIGH | `schema-` |
| 5 | Concurrency & Locking | MEDIUM-HIGH | `lock-` |
| 6 | Data Access Patterns | MEDIUM | `data-` |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM | `monitor-` |
| 8 | Advanced Features | LOW | `advanced-` |

## Reference Files

Each file has: why it matters, incorrect/correct SQL, EXPLAIN output, Supabase-specific notes.

### Query Performance (Critical)
- `references/query-missing-indexes.md` — detecting and adding missing indexes
- `references/query-index-types.md` — B-tree, GiST, GIN, BRIN selection
- `references/query-composite-indexes.md` — multi-column index design
- `references/query-covering-indexes.md` — index-only scans
- `references/query-partial-indexes.md` — filtered indexes for common WHERE clauses

### Connection Management (Critical)
- `references/conn-pooling.md` — PgBouncer and Supabase pooler config
- `references/conn-limits.md` — max connections and right-sizing
- `references/conn-idle-timeout.md` — idle connection cleanup
- `references/conn-prepared-statements.md` — prepared statement mode

### Security & RLS (Critical)
- `references/security-rls-basics.md` — Row-Level Security fundamentals
- `references/security-rls-performance.md` — RLS performance pitfalls
- `references/security-privileges.md` — role and grant management
- `references/security-search-path.md` — SET search_path on SQL functions to prevent injection

### Schema Design (High)
- `references/schema-primary-keys.md` — PK selection and performance
- `references/schema-foreign-key-indexes.md` — FK index requirements
- `references/schema-data-types.md` — type selection (timestamptz, bigint, text)
- `references/schema-constraints.md` — check, unique, exclusion constraints
- `references/schema-lowercase-identifiers.md` — naming conventions
- `references/schema-partitioning.md` — table partitioning strategies

### Concurrency & Locking (Medium-High)
- `references/lock-short-transactions.md` — keep transactions brief
- `references/lock-deadlock-prevention.md` — ordering and timeouts
- `references/lock-advisory.md` — application-level locks
- `references/lock-skip-locked.md` — queue processing pattern

### Data Access Patterns (Medium)
- `references/data-n-plus-one.md` — N+1 detection and JOINs
- `references/data-batch-inserts.md` — bulk insert optimization
- `references/data-pagination.md` — cursor vs offset pagination
- `references/data-upsert.md` — ON CONFLICT patterns

### Monitoring & Diagnostics (Low-Medium)
- `references/monitor-explain-analyze.md` — query plan interpretation
- `references/monitor-pg-stat-statements.md` — slow query identification
- `references/monitor-vacuum-analyze.md` — autovacuum tuning

### Advanced Features (Low)
- `references/advanced-full-text-search.md` — tsvector and GIN indexes
- `references/advanced-jsonb-indexing.md` — JSONB query optimization
