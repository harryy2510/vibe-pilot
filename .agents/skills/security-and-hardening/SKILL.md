---
name: security-and-hardening
description: "Use when handling auth, user input, secrets, permissions, uploads, webhooks, external integrations, database policies, or security-sensitive reviews."
---

# Security And Hardening

Protect boundaries, secrets, and user data without turning every task into a full audit. This skill is inspired by addyosmani/agent-skills and adapted for DotAgent projects.

## When to Apply

- Auth, authorization, sessions, cookies, API keys, webhooks, billing, file upload, email, or third-party integrations are involved.
- User-controlled input reaches a database, shell, URL, HTML, storage bucket, queue, or external API.
- RLS, permissions, CORS, CSP, rate limits, redirects, or tenant boundaries change.
- Reviewing a feature before release or a bug with data exposure risk.

## Workflow

1. Identify trust boundaries: browser, server, worker, database, third-party service, queue, file system, and generated config.
2. Classify sensitive assets: credentials, tokens, PII, tenant data, payment data, admin-only actions, and audit logs.
3. Verify authentication and authorization separately. Being logged in is not permission.
4. Validate and normalize input at the server boundary. Reuse repo schemas and generated database types.
5. Check storage and query scope for tenant/user isolation.
6. Review secrets handling without reading or editing `.env*` files.
7. Run focused tests or checks for the changed boundary.

## References

- Use `references/security-checklist.md` for a compact review checklist.
- Use `supabase-auth-data` and `supabase-postgres-best-practices` for Supabase/RLS work.
- Use `cloudflare` for Workers, Wrangler, and edge runtime hardening.

## Rules

- Never create, edit, delete, print, or stage `.env*` files.
- Never expose internal errors, tokens, secrets, stack traces, or provider payloads to clients.
- Never trust client-side role, tenant, or ownership fields.
- Never disable RLS, auth checks, validation, CSRF/CORS protections, or rate limits to make a feature work.
- Prefer allowlists over denylists for redirects, origins, file types, and provider events.

## Output

- Boundary and asset summary.
- Risks found and fixes made.
- Tests/checks run.
- Residual risk or manual secret/env step for the user.
