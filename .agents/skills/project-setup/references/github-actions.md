# GitHub Actions Workflow Templates

Full workflow YAML and CI/CD patterns for Cloudflare Workers + Supabase deploy.

## Architecture: Reusable Workflows

Deploy workflows are shared via `workflow_call` from an infra repo. Projects define thin callers:

```yaml
# .github/workflows/deploy-cloudflare.yml (caller in your project)
name: Deploy Cloudflare Workers
on:
  push:
    branches: [main]
    paths-ignore: ['supabase/**', '*.md']
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'production'
        type: choice
        options: [development, production]
jobs:
  deploy-dev:
    if: github.event_name == 'push' || github.event_name == 'pull_request' || inputs.environment == 'development'
    uses: YourOrg/infra/.github/workflows/cloudflare-deploy.yml@main
    with:
      environment: development
    secrets: inherit
  deploy-prod:
    if: github.event_name == 'push' || inputs.environment == 'production'
    uses: YourOrg/infra/.github/workflows/cloudflare-deploy.yml@main
    with:
      environment: production
    secrets: inherit
```

## Cloudflare Deploy Workflow (Reusable)

`.github/workflows/cloudflare-deploy.yml`:

```yaml
name: Deploy Cloudflare Workers

on:
  workflow_call:
    inputs:
      environment:
        description: 'Wrangler environment (omit for single-env projects)'
        required: false
        type: string
        default: ''
      working_directory:
        description: 'Working directory for the project'
        required: false
        type: string
        default: '.'
      pre_deploy_commands:
        description: 'Commands to run before build'
        required: false
        type: string
      skip_build:
        description: 'Skip build step'
        required: false
        type: boolean
        default: false
      skip_sync_env:
        description: 'Skip sync-env step'
        required: false
        type: boolean
        default: false
    secrets:
      CLOUDFLARE_API_TOKEN:
        required: true
      DOTENV_PRIVATE_KEY_DEVELOPMENT:
        required: false
      DOTENV_PRIVATE_KEY_PRODUCTION:
        required: false
      DOTENV_PRIVATE_KEY:
        required: false

permissions:
  contents: read
  pull-requests: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    concurrency:
      group: cf-workers-${{ github.event.pull_request.number || inputs.environment || 'production' }}-${{ github.repository }}
      cancel-in-progress: ${{ github.event.pull_request.number != '' }}

    environment: ${{ github.event.pull_request.number == '' && (inputs.environment || 'production') || '' }}

    env:
      IS_PREVIEW: ${{ github.event.pull_request.number != '' }}

    defaults:
      run:
        working-directory: ${{ inputs.working_directory }}

    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ github.event.pull_request.head.sha || '' }}

      - uses: actions/setup-node@v6
        with:
          node-version: '24'

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile
        env:
          DOTENV_PRIVATE_KEY_DEVELOPMENT: ${{ secrets.DOTENV_PRIVATE_KEY_DEVELOPMENT }}
          DOTENV_PRIVATE_KEY_PRODUCTION: ${{ secrets.DOTENV_PRIVATE_KEY_PRODUCTION }}
          DOTENV_PRIVATE_KEY: ${{ secrets.DOTENV_PRIVATE_KEY }}

      - name: Detect env tier
        id: env-tier
        run: |
          if [ -f .env.development ] || [ -f .env.production ]; then
            echo "tier=multi" >> "$GITHUB_OUTPUT"
          elif [ -f .env ]; then
            echo "tier=single" >> "$GITHUB_OUTPUT"
          else
            echo "tier=none" >> "$GITHUB_OUTPUT"
          fi

      - name: Push secrets to Cloudflare
        if: ${{ !inputs.skip_sync_env && steps.env-tier.outputs.tier != 'none' }}
        run: bunx @utilities-studio/sync-env@latest cloudflare ${{ inputs.environment != '' && format('--env {0}', inputs.environment) || '' }}
        env:
          DOTENV_PRIVATE_KEY_DEVELOPMENT: ${{ inputs.environment == 'development' && secrets.DOTENV_PRIVATE_KEY_DEVELOPMENT || '' }}
          DOTENV_PRIVATE_KEY_PRODUCTION: ${{ inputs.environment == 'production' && secrets.DOTENV_PRIVATE_KEY_PRODUCTION || '' }}
          DOTENV_PRIVATE_KEY: ${{ steps.env-tier.outputs.tier == 'single' && secrets.DOTENV_PRIVATE_KEY || '' }}

      - name: Run pre-deploy commands
        if: inputs.pre_deploy_commands != ''
        run: ${{ inputs.pre_deploy_commands }}

      - name: Build
        if: ${{ !inputs.skip_build }}
        run: bun run build ${{ inputs.environment != '' && format('-- --mode {0}', inputs.environment) || '' }}
        env:
          CLOUDFLARE_ENV: ${{ inputs.environment }}

      - name: Deploy
        if: env.IS_PREVIEW != 'true'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy ${{ inputs.environment != '' && format('--env {0}', inputs.environment) || '' }}
          workingDirectory: ${{ inputs.working_directory }}
          packageManager: bun

      - name: Upload preview version
        if: env.IS_PREVIEW == 'true'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: versions upload ${{ inputs.environment != '' && '--env development' || '' }} --preview-alias pr-${{ github.event.pull_request.number }}
          workingDirectory: ${{ inputs.working_directory }}
          packageManager: bun
```

**Critical:** `--mode ${{ inputs.environment }}` tells Vite which `.env.*` to load. Without it, `vite build` always loads `.env.production`.

**Preview deploys:** On PRs, the workflow uploads a preview version instead of deploying. Add PR comment steps (started/success/failed) using `actions/github-script@v7` with a marker comment for idempotent updates.

## Supabase Deploy Workflow (Reusable)

`.github/workflows/supabase-deploy.yml`:

```yaml
name: Deploy Supabase

on:
  workflow_call:
    inputs:
      environment:
        description: 'Environment to deploy (omit for single-env projects)'
        required: false
        type: string
        default: ''
      deploy_migrations:
        description: 'Deploy database migrations'
        required: false
        type: boolean
        default: true
      deploy_functions:
        description: 'Deploy edge functions'
        required: false
        type: boolean
        default: true
      working_directory:
        description: 'Working directory for the project'
        required: false
        type: string
        default: '.'
    secrets:
      DOTENV_PRIVATE_KEY_DEVELOPMENT:
        required: false
      DOTENV_PRIVATE_KEY_PRODUCTION:
        required: false
      DOTENV_PRIVATE_KEY:
        required: false

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    concurrency:
      group: supabase-deploy-${{ inputs.environment || 'default' }}-${{ github.repository }}
      cancel-in-progress: false

    environment: ${{ inputs.environment || 'production' }}

    defaults:
      run:
        working-directory: ${{ inputs.working_directory }}

    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v6
        with:
          node-version: '24'

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile
        env:
          DOTENV_PRIVATE_KEY_DEVELOPMENT: ${{ secrets.DOTENV_PRIVATE_KEY_DEVELOPMENT }}
          DOTENV_PRIVATE_KEY_PRODUCTION: ${{ secrets.DOTENV_PRIVATE_KEY_PRODUCTION }}
          DOTENV_PRIVATE_KEY: ${{ secrets.DOTENV_PRIVATE_KEY }}

      - name: Resolve env file
        id: env-file
        run: |
          if [ -n "${{ inputs.environment }}" ]; then
            FILE=".env.${{ inputs.environment }}"
          elif [ -f .env ]; then
            FILE=".env"
          else
            echo "Error: No env file found" && exit 1
          fi
          if [ ! -f "$FILE" ]; then
            echo "Error: $FILE not found" && exit 1
          fi
          echo "path=$FILE" >> "$GITHUB_OUTPUT"

      - name: Load env vars
        run: |
          while IFS= read -r line; do
            [[ -z "$line" || "$line" =~ ^# ]] && continue
            key="${line%%=*}"
            value="${line#*=}"
            value="${value%\"}"
            value="${value#\"}"
            [[ "$key" =~ ^(DOTENV_|NODE_OPTIONS|VITE_) ]] && continue
            echo "::add-mask::$value"
            echo "$key=$value" >> "$GITHUB_ENV"
          done < ${{ steps.env-file.outputs.path }}

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - run: supabase link --project-ref ${{ env.SUPABASE_PROJECT_ID }}

      - name: Sync edge function secrets
        run: bunx @utilities-studio/sync-env@latest supabase ${{ inputs.environment != '' && format('--env {0}', inputs.environment) || '' }}

      - name: Push config
        run: supabase config push --yes

      - name: Deploy migrations
        if: inputs.deploy_migrations
        run: supabase db push --include-all --yes

      - name: Deploy edge functions
        if: inputs.deploy_functions
        run: supabase functions deploy

      - name: Tag deployment
        env:
          DEPLOY_ENV: ${{ inputs.environment }}
        run: |
          # Workflow-owned push. Agents still must not run git push locally.
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          SUFFIX="${DEPLOY_ENV:+${DEPLOY_ENV}-}"
          TAG="supabase-deploy-${SUFFIX}$(date -u +%Y%m%d-%H%M%S)"
          git tag "$TAG"
          git push origin "$TAG"
```

**Load env vars step:** masks values with `::add-mask::` before writing to `GITHUB_ENV`. Skips `NODE_OPTIONS` (quoted value breaks GITHUB_ENV), `VITE_*` (not needed by Supabase CLI), `DOTENV_*` (internal).

**Deployment tags:** Supabase deploys are tagged with `supabase-deploy-{env}-{timestamp}` for rollback tracking.

## Environment Tier Detection

Both workflows auto-detect the project's env setup:

| Tier | Condition | Keys needed |
|------|-----------|-------------|
| `multi` | `.env.development` and/or `.env.production` exist | `DOTENV_PRIVATE_KEY_DEVELOPMENT`, `DOTENV_PRIVATE_KEY_PRODUCTION` |
| `single` | Only `.env` exists | `DOTENV_PRIVATE_KEY` |
| `none` | No env files | Skip sync |

This allows the same reusable workflow to work across projects with different env strategies.

## Key Workflow Patterns

### Concurrency

```yaml
concurrency:
  group: <service>-deploy-${{ inputs.environment || 'default' }}-${{ github.repository }}
  cancel-in-progress: false
```

Never cancel deploys in progress -- they might leave partial state. Include `${{ github.repository }}` to prevent cross-repo collisions when using reusable workflows.

### Preview Deploys (Cloudflare)

On PRs, the workflow uploads a preview version instead of deploying to production:

```yaml
- name: Upload preview version
  if: env.IS_PREVIEW == 'true'
  uses: cloudflare/wrangler-action@v3
  with:
    command: versions upload --preview-alias pr-${{ github.event.pull_request.number }}
```

Use `actions/github-script@v7` with HTML comment markers (`<!-- cf-workers-preview -->`) for idempotent PR comment updates showing deploy status and preview URL.

### Node.js + Bun Setup

Both tools are needed in CI -- bun for package management and scripts, Node.js for tools like wrangler:

```yaml
- uses: actions/setup-node@v6
  with:
    node-version: '24'
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest
```

## GitHub Actions Documentation Guide

### Answering GitHub Actions Questions

When answering GitHub Actions questions, follow this workflow:

1. **Classify** -- decide which bucket (syntax, runners, security, deployments, migration, etc.)
2. **Search official docs first** -- treat `docs.github.com/en/actions` as source of truth
3. **Open the best page before answering** -- use `references/topic-map.md` to find the right neighborhood
4. **Answer with docs-grounded guidance** -- include exact links, not just the homepage

### Answer Shape

1. Direct answer
2. Relevant docs links
3. Example YAML (only if needed)
4. Explicit inference callout (only if connecting multiple docs pages)

### Search Tips

| Question type | Prefer these docs |
|---|---|
| Concepts | Overview/concept pages first |
| Syntax | Workflow syntax, events, contexts, variables, expressions reference |
| Security | Secure use, Secrets, GITHUB_TOKEN, OIDC, artifact attestations |
| Deployments | Environments and deployment protection docs |
| Migration | Migration hub page, then platform-specific guide |
| Beginner | Tutorials/quickstarts, not raw reference |

### Common Mistakes

- Answering from memory without verifying current docs
- Linking the Actions landing page when a narrower page exists
- Mixing up reusable workflows and composite actions
- Suggesting long-lived cloud credentials when OIDC is documented
- Treating repo-specific CI debugging as a docs question (use `gh-fix-ci` instead)
