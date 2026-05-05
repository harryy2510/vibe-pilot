---
name: cloudflare
description: Workers best practices, Wrangler CLI quick reference, and wrangler.jsonc config. Load when writing/reviewing Workers code, configuring wrangler.jsonc, or running wrangler commands. Biases towards retrieval from Cloudflare docs over pre-trained knowledge.
---

# Cloudflare Workers + Wrangler

**Prefer retrieval over pre-training** for Workers APIs, types, config fields, and CLI flags.

## Retrieval Sources

| Source | How to retrieve |
|--------|----------------|
| Workers best practices | Fetch `https://developers.cloudflare.com/workers/best-practices/workers-best-practices/` |
| Workers types | `bunx wrangler types` generates typed `Env` (see `references/review.md`) |
| Wrangler config schema | `node_modules/wrangler/config-schema.json` |
| Cloudflare docs | `https://developers.cloudflare.com/workers/` |

## Workers Best Practices

### Configuration
- **compatibility_date** — set to today on new projects; update periodically
- **nodejs_compat** — enable the flag; many libraries need Node.js built-ins
- **wrangler types** — generate `Env` from config; never hand-write binding interfaces
- **Secrets** — `wrangler secret put`; never hardcode in config or source
- **wrangler.jsonc** — use JSONC config; newer features are JSON-only
- **Workers Static Assets** — use Workers, not Pages, for new static/full-stack deployments unless the repo already chose Pages

### Request & Response
- **Streaming** — stream large/unknown payloads; never `await response.text()` on unbounded data
- **waitUntil** — use `ctx.waitUntil()` for post-response work; never destructure `ctx`

### Architecture
- **Bindings over REST** — use in-process bindings (KV, R2, D1, Queues), not REST API
- **Queues & Workflows** — move async/background work off the critical path
- **Service bindings** — Worker-to-Worker calls via bindings, not public HTTP
- **Hyperdrive** — always use for external PostgreSQL/MySQL connections

### Observability
- **Logs & Traces** — enable `observability` in config with `head_sampling_rate`; structured JSON logging

### Code Patterns
- **No global request state** — never store request-scoped data in module-level variables
- **Floating promises** — every Promise must be `await`ed, `return`ed, `void`ed, or passed to `ctx.waitUntil()`

### Security
- **Web Crypto** — use `crypto.randomUUID()` / `crypto.getRandomValues()`; never `Math.random()` for security
- **No passThroughOnException** — use explicit try/catch with structured error responses

## Anti-Patterns to Flag

| Anti-pattern | Fix |
|-------------|-----|
| `await response.text()` on unbounded data | Stream it (128 MB limit) |
| Hardcoded secrets | `wrangler secret put` |
| `Math.random()` for tokens | `crypto.randomUUID()` |
| Bare `fetch()` without await/waitUntil | Floating promise — await or `ctx.waitUntil()` |
| Module-level mutable variables | Pass state through handler args |
| REST API from inside Worker | Use bindings |
| `ctx.passThroughOnException()` | Explicit try/catch |
| Hand-written `Env` interface | `wrangler types` |
| Direct string comparison for secrets | `crypto.subtle.timingSafeEqual` |
| Destructuring `ctx` | Loses `this` binding — "Illegal invocation" |
| `any` on `Env` or handler params | Type properly |
| `implements` on platform base classes | Use `extends` (DurableObject, WorkerEntrypoint, Workflow) |
| `env.X` in platform base class | Use `this.env.X` |

## Wrangler Quick Reference

```bash
wrangler --version          # Requires v4.x+
```

### Core Commands

| Task | Command |
|------|---------|
| Local dev server | `wrangler dev` |
| Deploy | `wrangler deploy` |
| Deploy dry run | `wrangler deploy --dry-run` |
| Generate types | `wrangler types` |
| Profile startup | `wrangler check startup` |
| Live logs | `wrangler tail` |
| Set secret | `wrangler secret put KEY` |
| List secrets | `wrangler secret list` |
| Auth status | `wrangler whoami` |
| Delete Worker | `wrangler delete` |

### Resource Commands

| Resource | Create | List |
|----------|--------|------|
| KV namespace | `wrangler kv namespace create NAME` | `wrangler kv namespace list` |
| R2 bucket | `wrangler r2 bucket create NAME` | `wrangler r2 bucket list` |
| D1 database | `wrangler d1 create NAME` | `wrangler d1 list` |
| D1 migration | `wrangler d1 migrations create DB NAME` | `wrangler d1 migrations list DB` |
| D1 execute | `wrangler d1 execute DB --remote --command "SQL"` | — |
| Vectorize | `wrangler vectorize create NAME --dimensions N --metric cosine` | `wrangler vectorize list` |
| Hyperdrive | `wrangler hyperdrive create NAME --connection-string "..."` | `wrangler hyperdrive list` |
| Queue | `wrangler queues create NAME` | `wrangler queues list` |

### Local Development

```bash
wrangler dev                    # Local mode (default)
wrangler dev --env staging      # Specific environment
wrangler dev --port 8787        # Custom port
wrangler dev --test-scheduled   # Test cron handlers (visit /__scheduled)
```

Local secrets go in `.dev.vars`. Do not write secrets yourself; tell the user what to create or update:
```
API_KEY=local-dev-key
```

## Config (wrangler.jsonc)

### Minimal

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "<today>",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true, "head_sampling_rate": 1 }
}
```

### Common Bindings

```jsonc
{
  "kv_namespaces": [{ "binding": "KV", "id": "<ID>" }],
  "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "my-bucket" }],
  "d1_databases": [{ "binding": "DB", "database_name": "my-db", "database_id": "<ID>" }],
  "ai": { "binding": "AI" },
  "vectorize": [{ "binding": "INDEX", "index_name": "my-index" }],
  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<ID>" }],
  "durable_objects": { "bindings": [{ "name": "COUNTER", "class_name": "Counter" }] },
  "queues": {
    "producers": [{ "binding": "MY_QUEUE", "queue": "my-queue" }],
    "consumers": [{ "queue": "my-queue", "max_batch_size": 10, "max_batch_timeout": 30 }]
  },
  "workflows": [{ "binding": "WF", "name": "my-workflow", "class_name": "MyWorkflow" }],
  "triggers": { "crons": ["0 * * * *"] },
  "env": { "staging": { "name": "my-worker-staging", "vars": { "ENVIRONMENT": "staging" } } }
}
```

Use `remote: true` on bindings that require it during local dev (AI, Vectorize, Browser Rendering).

## Review Workflow

1. **Retrieve** latest best practices, workers types, wrangler schema
2. **Read full files** — not just diffs; context matters for binding access
3. **Check types** — binding access, handler signatures, no `any`, no unsafe casts
4. **Check config** — compatibility_date, nodejs_compat, observability, secrets
5. **Check patterns** — streaming, floating promises, global state
6. **Check security** — crypto usage, secret handling, timing-safe comparisons
7. **Validate** — `oxlint --type-aware --type-check`, including floating promise checks

## Related Skills

- **Workflows**: see [Rules of Workflows](https://developers.cloudflare.com/workflows/build/rules-of-workflows/)
- **Durable Objects**: see [Cloudflare Durable Objects docs](https://developers.cloudflare.com/durable-objects/)

## Reference Files

- `references/rules.md` — all best practice rules with code examples and anti-patterns
- `references/review.md` — type validation, config validation, binding access patterns
- `references/wrangler-cli.md` — full Wrangler CLI reference (all commands, flags, examples)
