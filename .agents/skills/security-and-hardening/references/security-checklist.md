# Security Checklist

Use this as a focused review aid. Load only when a security-sensitive boundary is in scope.

## Auth And Authorization

- Server verifies identity from trusted session/token state.
- Authorization checks resource ownership, tenant, role, and action.
- Admin paths have server-side role enforcement.
- Client-provided user, role, tenant, price, or permission fields are ignored or revalidated.
- Session/cookie settings match the framework and deployment target.

## Input And Output

- Server validates input with the repo's schema/parser.
- URLs, redirects, file names, MIME types, and webhook events use allowlists.
- HTML/Markdown rendering sanitizes or escapes untrusted content.
- Errors sent to clients are stable and do not leak stack traces or provider payloads.
- Logs avoid secrets, tokens, full cookies, and unnecessary PII.

## Data And Secrets

- Database queries are scoped by tenant/user where required.
- RLS policies or server guards cover read and write paths.
- Secret changes are described for the user instead of editing `.env*`.
- External API keys stay server-side.
- Webhooks verify signatures and reject replay or unknown event types when the provider supports it.

## Release Checks

- Focused tests cover unauthorized, forbidden, invalid input, and cross-tenant attempts.
- Dependency or platform warnings relevant to the change were checked.
- Rollback does not require exposing or rotating secrets manually unless stated.
