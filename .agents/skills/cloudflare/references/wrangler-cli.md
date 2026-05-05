# Wrangler CLI — Full Reference

Complete command reference for Wrangler v4.x+. For quick reference, see the main SKILL.md.

## Installation & Auth

```bash
bun add -D wrangler@latest
wrangler --version
wrangler login
wrangler whoami
```

## Quick Start

```bash
bunx wrangler init my-worker
bunx create-cloudflare@latest my-app   # Framework starter
```

## Local Development

```bash
wrangler dev                    # Local mode (default) — local storage simulation
wrangler dev --env staging      # Specific environment
wrangler dev --local            # Force local-only (disable remote bindings)
wrangler dev --remote           # Run on Cloudflare edge for existing remote-binding workflows
wrangler dev --port 8787        # Custom port
wrangler dev --live-reload      # Live reload for HTML changes
wrangler dev --test-scheduled   # Test cron handlers (visit /__scheduled)
```

### Remote Bindings for Local Dev

Use `remote: true` in binding config to connect to real resources while running locally:

```jsonc
{
  "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "my-bucket", "remote": true }],
  "ai": { "binding": "AI", "remote": true },
  "vectorize": [{ "binding": "INDEX", "index_name": "my-index", "remote": true }]
}
```

**Recommended remote bindings**: AI (required), Vectorize, Browser Rendering, mTLS, Images.

### Local Secrets

Create `.dev.vars` for local development secrets:

```
API_KEY=local-dev-key
DATABASE_URL=postgres://localhost:5432/dev
```

## Deployment

```bash
wrangler deploy                 # Deploy to production
wrangler deploy --env staging   # Deploy specific environment
wrangler deploy --dry-run       # Validate without deploying
wrangler deploy --keep-vars     # Keep dashboard-set variables
wrangler deploy --minify        # Minify code
```

### Versions and Rollback

```bash
wrangler versions list
wrangler versions view <VERSION_ID>
wrangler rollback
wrangler rollback <VERSION_ID>
```

## Secrets

```bash
wrangler secret put API_KEY                         # Set interactively
echo "secret-value" | wrangler secret put API_KEY   # Set from stdin
wrangler secret list
wrangler secret delete API_KEY
wrangler secret bulk secrets.json                    # Bulk from JSON
```

## Types

```bash
wrangler types                      # Generate worker-configuration.d.ts
wrangler types ./src/env.d.ts       # Custom output path
wrangler types --check              # Check types are up to date (CI)
```

## Startup Profiling

```bash
wrangler check startup              # Profile startup time, detect limit violations
```

## KV (Key-Value Store)

### Namespaces

```bash
wrangler kv namespace create MY_KV
wrangler kv namespace list
wrangler kv namespace delete --namespace-id <ID>
```

### Keys

```bash
wrangler kv key put --namespace-id <ID> "key" "value"
wrangler kv key put --namespace-id <ID> "key" "value" --expiration-ttl 3600
wrangler kv key get --namespace-id <ID> "key"
wrangler kv key list --namespace-id <ID>
wrangler kv key delete --namespace-id <ID> "key"
wrangler kv bulk put --namespace-id <ID> data.json
```

### Config Binding

```jsonc
{
  "kv_namespaces": [
    { "binding": "CACHE", "id": "<NAMESPACE_ID>" }
  ]
}
```

## R2 (Object Storage)

### Buckets

```bash
wrangler r2 bucket create my-bucket
wrangler r2 bucket create my-bucket --location wnam
wrangler r2 bucket list
wrangler r2 bucket info my-bucket
wrangler r2 bucket delete my-bucket
```

### Objects

```bash
wrangler r2 object put my-bucket/path/file.txt --file ./local-file.txt
wrangler r2 object get my-bucket/path/file.txt
wrangler r2 object delete my-bucket/path/file.txt
```

### Config Binding

```jsonc
{
  "r2_buckets": [
    { "binding": "ASSETS", "bucket_name": "my-bucket" }
  ]
}
```

## D1 (SQL Database)

### Databases

```bash
wrangler d1 create my-database
wrangler d1 create my-database --location wnam
wrangler d1 list
wrangler d1 info my-database
wrangler d1 delete my-database
```

### Execute SQL

```bash
wrangler d1 execute my-database --remote --command "SELECT * FROM users"
wrangler d1 execute my-database --remote --file ./schema.sql
wrangler d1 execute my-database --local --command "SELECT * FROM users"
```

### Migrations

```bash
wrangler d1 migrations create my-database create_users_table
wrangler d1 migrations list my-database --local
wrangler d1 migrations apply my-database --local
wrangler d1 migrations apply my-database --remote
```

### Export/Backup

```bash
wrangler d1 export my-database --remote --output backup.sql
wrangler d1 export my-database --remote --output schema.sql --no-data
```

### Config Binding

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-database",
      "database_id": "<DATABASE_ID>",
      "migrations_dir": "./migrations"
    }
  ]
}
```

## Vectorize (Vector Database)

### Indexes

```bash
wrangler vectorize create my-index --dimensions 768 --metric cosine
wrangler vectorize create my-index --preset @cf/baai/bge-base-en-v1.5
wrangler vectorize list
wrangler vectorize get my-index
wrangler vectorize delete my-index
```

### Vectors

```bash
wrangler vectorize insert my-index --file vectors.ndjson
wrangler vectorize query my-index --vector "[0.1, 0.2, ...]" --top-k 10
```

### Config Binding

```jsonc
{
  "vectorize": [
    { "binding": "SEARCH_INDEX", "index_name": "my-index" }
  ]
}
```

## Hyperdrive (Database Accelerator)

### Configs

```bash
wrangler hyperdrive create my-hyperdrive \
  --connection-string "postgres://user:pass@host:5432/database"
wrangler hyperdrive list
wrangler hyperdrive get <HYPERDRIVE_ID>
wrangler hyperdrive update <HYPERDRIVE_ID> --origin-password "new-password"
wrangler hyperdrive delete <HYPERDRIVE_ID>
```

### Config Binding

```jsonc
{
  "compatibility_flags": ["nodejs_compat"],
  "hyperdrive": [
    { "binding": "HYPERDRIVE", "id": "<HYPERDRIVE_ID>" }
  ]
}
```

## Workers AI

```bash
wrangler ai models
wrangler ai finetune list
```

### Config Binding

```jsonc
{
  "ai": { "binding": "AI" }
}
```

**Note**: Workers AI always runs remotely and incurs usage charges even in local dev.

## Queues

### Management

```bash
wrangler queues create my-queue
wrangler queues list
wrangler queues delete my-queue
wrangler queues consumer add my-queue my-worker
wrangler queues consumer remove my-queue my-worker
```

### Config Binding

```jsonc
{
  "queues": {
    "producers": [
      { "binding": "MY_QUEUE", "queue": "my-queue" }
    ],
    "consumers": [
      {
        "queue": "my-queue",
        "max_batch_size": 10,
        "max_batch_timeout": 30
      }
    ]
  }
}
```

## Containers

### Build and Push

```bash
wrangler containers build -t my-app:latest .
wrangler containers build -t my-app:latest . --push
wrangler containers push my-app:latest
```

### Management

```bash
wrangler containers list
wrangler containers info <CONTAINER_ID>
wrangler containers delete <CONTAINER_ID>
```

### Images

```bash
wrangler containers images list
wrangler containers images delete my-app:latest
```

### External Registries

```bash
wrangler containers registries list
wrangler containers registries configure <DOMAIN> --public-credential <KEY>
wrangler containers registries delete <DOMAIN>
```

## Workflows

### Management

```bash
wrangler workflows list
wrangler workflows describe my-workflow
wrangler workflows trigger my-workflow
wrangler workflows trigger my-workflow --params '{"key": "value"}'
wrangler workflows delete my-workflow
```

### Instances

```bash
wrangler workflows instances list my-workflow
wrangler workflows instances describe my-workflow <INSTANCE_ID>
wrangler workflows instances terminate my-workflow <INSTANCE_ID>
```

### Config Binding

```jsonc
{
  "workflows": [
    {
      "binding": "MY_WORKFLOW",
      "name": "my-workflow",
      "class_name": "MyWorkflow"
    }
  ]
}
```

## Pipelines

```bash
wrangler pipelines create my-pipeline --r2 my-bucket
wrangler pipelines list
wrangler pipelines show my-pipeline
wrangler pipelines update my-pipeline --batch-max-mb 100
wrangler pipelines delete my-pipeline
```

### Config Binding

```jsonc
{
  "pipelines": [
    { "binding": "MY_PIPELINE", "pipeline": "my-pipeline" }
  ]
}
```

## Secrets Store

### Stores

```bash
wrangler secrets-store store create my-store
wrangler secrets-store store list
wrangler secrets-store store delete <STORE_ID>
```

### Secrets

```bash
wrangler secrets-store secret put <STORE_ID> my-secret
wrangler secrets-store secret list <STORE_ID>
wrangler secrets-store secret get <STORE_ID> my-secret
wrangler secrets-store secret delete <STORE_ID> my-secret
```

### Config Binding

```jsonc
{
  "secrets_store_secrets": [
    {
      "binding": "MY_SECRET",
      "store_id": "<STORE_ID>",
      "secret_name": "my-secret"
    }
  ]
}
```

## Pages (Existing Pages Projects Only)

Prefer Workers Static Assets for new DotAgent projects. Use Pages commands only when the repo already uses Cloudflare Pages or the user explicitly asks for Pages.

```bash
wrangler pages project create my-site
wrangler pages deploy ./dist
wrangler pages deploy ./dist --branch main
wrangler pages deployment list --project-name my-site
```

## Observability

### Tail Logs

```bash
wrangler tail                       # Stream live logs
wrangler tail my-worker             # Specific Worker
wrangler tail --status error        # Filter by status
wrangler tail --search "error"      # Filter by search term
wrangler tail --format json         # JSON output
```

### Config

```jsonc
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

## Testing

### Vitest Setup

```bash
bun add -D @cloudflare/vitest-pool-workers vitest
```

`vitest.config.ts`:
```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
  },
});
```

### Test Scheduled Events

```bash
wrangler dev --test-scheduled
curl http://localhost:8787/__scheduled
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `command not found: wrangler` | `bun add -D wrangler` |
| Auth errors | `wrangler login` |
| Startup time limit exceeded | `wrangler check startup` |
| Type errors after config change | `wrangler types` |
| Local storage not persisting | Check `.wrangler/state` directory |
| Binding undefined in Worker | Verify binding name matches config exactly |

## Best Practices

1. Version control `wrangler.jsonc` — source of truth for Worker config
2. Use automatic provisioning — omit resource IDs for auto-creation on deploy
3. Run `wrangler types` in CI — catch binding mismatches early
4. Use environments — `env.staging`, `env.production`
5. Update `compatibility_date` quarterly
6. Use `.dev.vars` for local secrets — never commit
7. Test locally first with `wrangler dev`
8. Use `--dry-run` before major deploys
