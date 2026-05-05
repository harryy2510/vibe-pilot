---
name: scaffold
description: "Use when scaffolding a new fullstack project with TanStack Start, Supabase, React Query, and Cloudflare Workers. Use with: /scaffold"
user_invocable: true
---

# Project Scaffolding

## Fullstack Stack (TanStack Start + Supabase + Cloudflare)

TanStack Start + Router, React 19, React Query, react-hook-form + zod v4, zustand-x, Supabase (auth + DB + RLS), Tailwind CSS v4, shadcn/ui + base-ui, Cloudflare Workers, Bun, TypeScript, oxlint, oxfmt, Agent Toolkit hooks

### Before You Start

Gather from the user:
- **Project name** (package.json, manifest, page titles)
- **Supabase project URL + anon key** (or "set up later")
- **Cloudflare worker name** (or use project name)
- **OAuth providers** (Google, GitHub, etc. — or "email only")

### Setup Sequence

Run each skill in sequence. Each builds on the previous.

| # | Skill | What it sets up |
|---|---|---|
| 1 | `project-setup` | Lint, format, git hooks, scripts, tsconfig, encrypted env, CI/CD |
| 2 | `ui` | Tailwind v4, shadcn + base-ui, dark mode, animations |
| 3 | `tanstack-start-cloudflare` | Router, layouts, breadcrumbs, metadata, server fns, deploy |
| 4 | `supabase-auth-data` | 3 clients, auth flow, types, migrations, env vars |
| 5 | `react-query-mutative` | QueryClient config, key factories, optimistic updates |
| 6 | `forms-rhf-zod` | Form patterns, zod schemas, create/edit modes |
| 7 | `zustand-x-ui-state` | UI state store, boundary rules |

For each skill:
1. Invoke the skill to get the reference
2. Implement what it describes (create files, install packages, write configs)
3. Verify (`bun check` after #1, `bun dev` after #3)
4. Move to next skill

### Post-Setup Checklist

- [ ] `bun check` passes clean
- [ ] `bun dev` starts on port 3000
- [ ] Auth flow works (login page renders, protected routes redirect)
- [ ] Commit: `git add -A && git commit -m "scaffold fullstack project"`

### Project Structure

```
src/
├── api/auth/           # schemas, functions, keys, hooks
├── components/app/     # AppSidebar, AppTopBar, AuthLayout
├── components/ui/      # shadcn/base-ui components
├── hooks/              # Shared hooks
├── libs/
│   ├── cn.ts           # twMerge + clsx
│   ├── form.ts         # zodFormResolver
│   ├── query/          # root-provider, optimistic, devtools
│   ├── supabase/       # client, server, admin
│   └── zustand/        # ui-store
├── routes/             # __root, _auth/*, _authed/*
├── styles.css          # Tailwind v4 + theme
├── types/              # database.types.ts (auto-generated)
└── router.tsx          # Router creation + context
scripts/
├── generate-vite-env.ts
└── sync-env.ts
```

### Key Packages

**Dependencies**: @base-ui-components/react, @supabase/supabase-js, @supabase/ssr, @cloudflare/vite-plugin, @tanstack/react-start, @tanstack/react-router, @tanstack/react-query, @tanstack/react-router-ssr-query, react-hook-form, @hookform/resolvers, zod, zod-empty, zustand, zustand-x, mutative, es-toolkit, usehooks-ts, motion, dayjs, sonner, class-variance-authority, clsx, tailwind-merge, lucide-react, react, react-dom

**Dev**: typescript, vite, @vitejs/plugin-react, babel-plugin-react-compiler, @tailwindcss/vite, @tailwindcss/typography, @tanstack/devtools-vite, oxlint, oxfmt, wrangler, vitest, @testing-library/react, @testing-library/dom, jsdom

### Key Conventions

- `bun` package manager, `bunx` instead of `npx`
- `@/` import alias = `src/`
- `type` keyword only (never `interface`)
- Inline type imports: `import { type Foo } from './bar'`
- Named exports only (except configs)
- Tabs (width 2), single quotes, no semicolons, trailing commas
- Immutable migrations -- never edit executed migrations
