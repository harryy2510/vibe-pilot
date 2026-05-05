---
name: project-setup
description: "Use when setting up DX tooling (linting, formatting, git hooks, type checking), dotenvx encrypted env management, env sync scripts, CI/CD deploy workflows (Cloudflare + Supabase via GitHub Actions), or answering GitHub Actions documentation questions."
---

# Project Setup

Covers three domains: DX tooling (lint/format/hooks), encrypted environment management (dotenvx), and GitHub Actions CI/CD.

Env files are user-owned. Agents may add tooling, scripts, docs, and CI workflow code for env management, but must not create, edit, encrypt, decrypt, stage, commit, or run commands that write any `.env*` file. Give the user exact commands to run when env file contents need to change.

---

## 1. DX Tooling

Read the `toolchain` skill first. It owns the current defaults.

### Bun + TypeScript

- Use Bun for package management and TypeScript execution.
- Use TypeScript for new JavaScript-platform source code.
- Do not create `.js` or `.jsx` source files for new code.
- Do not add npm, yarn, pnpm, or npx workflows.

### Oxlint + Oxfmt

Use Oxlint for linting and type checking. Use Oxfmt for formatting.

```bash
bun add -d oxlint oxlint-tsgolint oxfmt @types/bun
```

`oxlint.config.ts`:

```ts
import { defineConfig } from 'oxlint'

export default defineConfig({
	options: {
		typeAware: true,
		typeCheck: true,
	},
})
```

### tsconfig.json

Use Bun-compatible TypeScript settings. Do not run `tsc` as the check command.

Required: `strict`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `noEmit`.

### Scripts

```json
{
	"scripts": {
		"test": "bun test",
		"check": "bun test && oxlint --type-aware --type-check .",
		"format": "oxfmt -w ."
	}
}
```

For Rust plus Bun repos:

```json
{
	"scripts": {
		"test": "bun test",
		"test:rust": "cargo test",
		"check": "bun test && cargo test && oxlint --type-aware --type-check .",
		"format": "oxfmt -w ."
	}
}
```

### Git Hooks

Use repo-local hooks installed by Agent Toolkit:

```bash
bunx @harryy/agent-toolkit repo bootstrap
```

Hooks should call `bunx @harryy/agent-toolkit repo check` and enforce Conventional Commit messages.

### generate-vite-env.ts

May read user-owned env files to generate non-env artifacts such as `src/vite-env.d.ts`. It must not modify `.env*`.

### .gitignore

```
node_modules/
dist/
.env
.env.*
!.env.example
*.tsbuildinfo
.wrangler/
```

---

## 2. Encrypted Environment (dotenvx)

### Quick Setup

1. `bun add @dotenvx/dotenvx`
2. Ask the user to encrypt env files themselves: `dotenvx encrypt -f .env.development --stdout > .env.development.encrypted` (same for production)
3. Add env-management scripts only when the user requested dotenvx setup; do not run scripts that write `.env*`
4. Do not add auto-encryption hooks unless the user explicitly asks; hooks that write `.env*` files are user-owned behavior
5. If local Supabase overrides are needed, create a helper that prints env content to stdout; the user redirects it to `.env.development.local`
6. Create `scripts/sync-env.ts` to push secrets to Cloudflare + Supabase

### Key Script Patterns

- **postinstall** uses `;` not `&&` (each file decrypts independently) and ends with `; true` (never fails install)
- **env:encrypt** uses `&&` (fail loudly on error)
- **sync-env** uses `wrangler versions secret bulk` (atomic), NOT individual `secret put` (races)
- **Supabase sync** auto-scans `supabase/functions/**/*.ts` for `Deno.env.get('KEY')` calls

### GitHub Secrets (3 total)

| Secret | Scope |
|---|---|
| `DOTENV_PRIVATE_KEY_DEVELOPMENT` | `development` environment |
| `DOTENV_PRIVATE_KEY_PRODUCTION` | `production` environment |
| `CLOUDFLARE_API_TOKEN` | repo-level |

For full playbook (scripts, file architecture, wrangler cleanup, dashboard cleanup): `references/dotenvx-playbook.md`

---

## 3. CI/CD (GitHub Actions)

### Architecture: Reusable Workflows

Deploy workflows live in a shared infra repo and are consumed via `workflow_call`. Projects define thin callers with `uses: YourOrg/infra/.github/workflows/<workflow>.yml@main` and `secrets: inherit`. See `references/github-actions.md` for caller examples.

### Environment Tier Detection

Workflows auto-detect the project's env tier before syncing secrets:

| Tier | Condition | Keys needed |
|------|-----------|-------------|
| `multi` | `.env.development` and/or `.env.production` exist | `DOTENV_PRIVATE_KEY_DEVELOPMENT`, `DOTENV_PRIVATE_KEY_PRODUCTION` |
| `single` | Only `.env` exists | `DOTENV_PRIVATE_KEY` |
| `none` | No env files | (skip sync) |

### Cloudflare Deploy (`cloudflare-deploy.yml`)

- Reusable `workflow_call` with inputs: `environment`, `working_directory`, `pre_deploy_commands`, `skip_build`, `skip_sync_env`
- Uses `cloudflare/wrangler-action@v3` for deploy (not raw `bunx wrangler deploy`)
- **Preview deploys**: On PRs, uploads a preview version via `wrangler versions upload --preview-alias pr-N` and comments the preview URL on the PR
- Steps: checkout -> setup Node.js 24 + bun -> install -> detect env tier -> sync secrets -> build with `--mode` -> deploy/preview
- **Critical**: `--mode ${{ inputs.environment }}` tells Vite which `.env.*` to load. Without it, always loads `.env.production`.

### Supabase Deploy (`supabase-deploy.yml`)

- Reusable `workflow_call` with inputs: `environment`, `deploy_migrations`, `deploy_functions`, `working_directory`
- Loads env vars from decrypted `.env.*` into `GITHUB_ENV` (skips `NODE_OPTIONS`, `VITE_*`, `DOTENV_*`)
- **Masks secrets**: uses `::add-mask::$value` before writing to `GITHUB_ENV`
- Steps: checkout (fetch-depth 0) -> setup Node.js 24 + bun -> install -> resolve env file -> load env -> supabase link -> sync secrets -> config push -> db push -> deploy functions -> tag deployment
- `fetch-depth: 0` required for migration history

### Shared Patterns

- Both use concurrency groups with `cancel-in-progress: false` (never cancel deploys mid-flight)
- All GitHub Actions workflows that need Node.js use `actions/setup-node@v6` with `node-version: '24'`.
- Both decrypt env files via `postinstall` during `bun install`
- Both support single-env and multi-env projects via tier detection
- Uses `@utilities-studio/sync-env@latest` for secret syncing (not local `bun sync-env`)

For full workflow YAML templates: `references/github-actions.md`

### Claude Code Workflows

Claude Code workflows (`claude.yml`, `claude-code-review.yml`) follow the same delegation pattern -- thin callers in each repo that `uses:` shared templates from the infra repo, passing only `CLAUDE_CODE_OAUTH_TOKEN`. Required permissions: `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write`, `actions: read`.

### Answering GitHub Actions Questions

1. Classify the question (syntax, runners, security, deployments, migration, etc.)
2. Search `docs.github.com/en/actions` as source of truth
3. Open the best page before answering -- use `references/topic-map.md` as a routing aid
4. Answer with docs-grounded guidance and exact links

---

## Gotchas

- **postinstall `;` not `&&`**: CI jobs have environment-scoped keys. `&&` short-circuits if first decrypt fails. End with `; true`.
- **Vite mode**: `vite build` defaults to `mode: production`. Dev deploys MUST pass `--mode development`.
- **`wrangler versions secret bulk`**: Individual `secret put` calls race and silently drop secrets.
- **GITHUB_ENV**: Skip `NODE_OPTIONS` (quoted values break it). Always `::add-mask::$value` before writing secrets.
- **Supabase auto-scan limitation**: Only picks up literal `Deno.env.get('KEY')`. Dynamic key access won't be detected.
- **Node.js in CI**: Always include `actions/setup-node@v6` with `node-version: '24'` alongside bun when a Node runtime is needed.
- **`cloudflare/wrangler-action@v3`**: Prefer over raw `bunx wrangler deploy` -- handles API token setup and output parsing.
- **Reusable vs composite actions**: Don't mix these up when answering GitHub Actions questions.
- **OIDC over long-lived credentials**: Prefer OIDC when GitHub docs support it for the target cloud.
