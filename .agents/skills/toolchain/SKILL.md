---
name: toolchain
description: "Use for package manager choices, TypeScript execution, linting, formatting, type checking, git hooks, commit messages, or DX setup."
---

# Toolchain

Use this skill before changing scripts, package metadata, linting, formatting, type checking, hooks, or CI.

## Defaults

- Use Bun for package management and execution.
- Use TypeScript for JavaScript-platform source code.
- Do not create `.js` or `.jsx` source files for new code.
- Use Rust for hot-path native tooling when performance matters.
- Use `oxlint --type-aware --type-check` for linting and type checking.
- Use `oxfmt` for formatting.
- Use Husky for git hooks. Do not introduce `.githooks` or ad hoc hook folders.
- GitHub Actions workflows must use Node.js 24 with `actions/setup-node@v6` when a Node runtime is needed.
- Do not add ESLint, Prettier, `tsc --noEmit`, npm, yarn, pnpm, or npx workflows.

## Package Scripts

Preferred scripts for Bun TypeScript repos:

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

## TypeScript

- Keep `strict` enabled.
- Use `type` over `interface` when both are acceptable.
- Avoid `any` and `as` assertions unless unavoidable.
- Every promise must be awaited, returned, voided, or passed to the correct runtime mechanism.
- Do not use `@ts-ignore`, `@ts-expect-error`, or lint disables unless the reason is documented beside the suppression.

## Git

- Any commit created by an agent must use Conventional Commit format.
- Examples: `feat: add repo intelligence`, `fix(cli): preserve user files`, `chore!: remove old setup`.
- Do not skip hooks.
- Use Husky repo-local hooks that call `bunx @harryy/agent-toolkit`.
- For isolated worktrees, create from the latest target branch, run setup/check baseline before editing, and clean up only after the user accepts merge/PR/discard.

## Verification

- Prefer `bun run check` when available.
- Run `bunx @harryy/agent-toolkit repo check` in agentized repos.
- Run `agents sync --check` when `AGENTS.md` or `.agents/` changed.
