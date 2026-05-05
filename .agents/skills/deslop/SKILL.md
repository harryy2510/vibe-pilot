---
name: deslop
description: "Use when reviewing AI-generated code quality, checking for slop patterns (debug statements, placeholders, empty catches, hardcoded secrets), or running pre-commit code quality scans."
---

# Deslop — Code Quality Scanner

Detects and flags "slop" — low-quality patterns common in AI-generated code. Runs as a bash script using grep/ripgrep. No AI tokens burned — pure regex detection.

Patterns sourced from [agentsys](https://github.com/agent-sh/agentsys) (MIT licensed, 1,000+ repo testing).

## First-Time Setup

The script works standalone — no dependencies beyond `grep` (or `rg` for speed).

```bash
# Run on current directory
bash scripts/deslop.sh .

# Run on specific path
bash scripts/deslop.sh src/

# Run on staged files only (pre-commit)
bash scripts/deslop.sh --staged
```

## What It Detects

### Critical (auto-fix: flag)
- **Hardcoded secrets** — API keys, tokens, passwords, JWT, AWS/GCP/Stripe credentials
- **Placeholder code** — `throw new Error("...")` stubs, empty functions, `pass`-only Python functions
- **Empty error handling** — `catch {}`, `except: pass`

### Medium (auto-fix: remove/flag)
- **Debug statements** — `console.log/debug`, Python `print()`, Rust `println!`
- **Placeholder text** — lorem ipsum, test test test, "replace this"
- **Bare `.unwrap()` in Rust** — should use `.expect()` or `?` operator

### Low (auto-fix: flag)
- **Stale task-marker comments** — unfinished placeholders left in code
- **Disabled linter rules** — `eslint-disable`, `noqa`, `#[allow()]`
- **Mixed indentation** — tabs + spaces

## Integration

### As pre-commit hook

Add to `.husky/pre-commit` after the conventions check:

```bash
bash scripts/deslop.sh --staged
```

### As CI check

```yaml
- name: Deslop scan
  run: bash scripts/deslop.sh src/
```

## Full pattern reference

See `references/patterns.md` for all regex patterns with examples.
