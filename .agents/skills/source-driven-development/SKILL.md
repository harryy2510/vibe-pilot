---
name: source-driven-development
description: "Use when implementing framework-specific code, choosing library APIs, upgrading dependencies, or when correctness depends on current official documentation."
---

# Source-Driven Development

Use current primary sources for framework and library decisions. This skill is inspired by addyosmani/agent-skills and adapted for DotAgent speed mode.

## When to Apply

- Writing framework-specific code from memory would be risky.
- The user asks for "latest", "current", "official", "verify", or "best practice".
- Creating starter code or patterns that other repos will copy.
- Upgrading dependencies or migrating across framework versions.
- Reviewing code that may use stale APIs.

Skip it for typos, renames, pure logic, or simple repo-local convention edits where external docs do not affect correctness.

## Workflow

1. Detect the exact stack and version from local files such as `package.json`, `bun.lock`, `Cargo.toml`, `pyproject.toml`, `go.mod`, or installed CLI output.
2. Fetch the smallest relevant official page: API reference, migration guide, release note, or standard document.
3. Prefer sources in this order: official docs, official changelog/blog, standards docs, runtime/browser compatibility data.
4. Treat tutorials, Stack Overflow, issue comments, and AI summaries as secondary context only.
5. Implement the repo-local pattern that matches the verified source.
6. If official docs conflict with existing code, state the conflict and choose the least disruptive repo-consistent path unless the user asked for modernization.
7. Cite the source in the final answer for non-obvious framework decisions. Use code comments only when the citation materially helps future maintainers.

## Rules

- Do not guess API signatures, config keys, file names, or migration steps when official docs are cheap to check.
- Do not cite a homepage when a deep API page exists.
- Do not cite community posts as the reason for production code.
- If a pattern cannot be verified, label it as unverified and keep the implementation conservative.
- Stop fetching once the required decision is supported; speed mode still applies.

## Output

- Stack/version detected.
- Sources used and what decision each source supported.
- Code or config changed.
- Focused verification command and result.
