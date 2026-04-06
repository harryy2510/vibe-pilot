---
name: model-agent-ref
description: Reference table mapping task types to model tiers and agent types. Referenced by classify and triage skills.
---

# Model & Agent Reference

This is a reference document — not a standalone skill. It's used by the classify and triage skills to determine which model tier and agent type should handle a task.

## Tiers

| Tier | When to Use | Cost |
|---|---|---|
| **low** | Simple, well-scoped tasks. Bug fixes, typos, config changes, documentation. | Cheapest |
| **medium** | Standard implementation. Components, APIs, migrations, features. | Moderate |
| **high** | Complex work requiring deep reasoning. Architecture, brainstorming, cross-domain features. | Expensive |

## Agent Types

| Agent | Domain | Example Tasks |
|---|---|---|
| Frontend Developer | UI, components, pages, layouts, responsive design, accessibility | "Add user settings page", "Fix mobile sidebar layout" |
| Backend Architect | APIs, server functions, integrations, system design | "Create webhook handler for Stripe", "Add caching layer" |
| Database Optimizer | Migrations, schema design, queries, RLS, indexes | "Add user_preferences table", "Optimize slow dashboard query" |
| Software Architect | Cross-cutting architecture, domain modeling, major refactors | "Design event system for notifications", "Plan microservice split" |
| Senior Developer | Complex full-stack features spanning multiple domains | "Build real-time collaboration feature", "Implement search" |
| Security Engineer | Auth flows, RLS policies, vulnerability fixes, encryption | "Add role-based access control", "Fix XSS in comment rendering" |
| DevOps Automator | CI/CD, deployment, Docker, infrastructure, monitoring | "Set up GitHub Actions pipeline", "Add health check endpoint" |
| UX Architect | Design systems, component hierarchies, layout architecture | "Create form field component library", "Design dashboard grid system" |
| Technical Writer | Documentation, API references, README, guides | "Write API documentation", "Add migration guide for v2" |
| Rapid Prototyper | MVPs, proof-of-concepts, quick validations | "Prototype AI chat widget", "Build demo for client meeting" |

## Decision Matrix

When classifying a task, use this priority order:

1. **Does it involve database changes?** → Database Optimizer (medium)
2. **Does it involve auth/security?** → Security Engineer (medium)
3. **Does it involve CI/CD/infra?** → DevOps Automator (medium)
4. **Is it primarily UI work?** → Frontend Developer (medium)
5. **Is it primarily API/server work?** → Backend Architect (medium)
6. **Does it span multiple domains?** → Senior Developer (medium or high)
7. **Does it need architecture decisions?** → Software Architect (high)
8. **Is it documentation?** → Technical Writer (low)
9. **Is it a simple fix?** → Senior Developer (low)
10. **Default** → Senior Developer (medium)

## Tier Escalation

Bump the tier up if:
- Task description is long (>500 words) — indicates complexity
- Task has multiple acceptance criteria
- Task involves unfamiliar patterns or new integrations
- Task requires coordinating changes across many files (15+)

Bump the tier down if:
- Task is a direct copy of existing patterns ("same as X but for Y")
- Task has a clear code example in the description
- Task is a known fix with a known solution
