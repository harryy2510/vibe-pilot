---
name: shadcn
description: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".
user-invocable: false
allowed-tools: Bash(bunx shadcn@latest *)
---

# shadcn/ui

Components are added as source code via the CLI. Use Bun: `bunx shadcn@latest`. Do not use `npx`, `pnpm dlx`, or `yarn dlx` in DotAgent projects.

## Current Project Context

```json
!`bunx shadcn@latest info --json`
```

Use `bunx shadcn@latest docs <component>` for documentation and example URLs.

## Principles

1. **Use existing components first.** Use `bunx shadcn@latest search` before writing custom UI.
2. **Compose, don't reinvent.** Settings page = Tabs + Card + form controls.
3. **Use built-in variants before custom styles.** `variant="outline"`, `size="sm"`, etc.
4. **Use semantic colors.** `bg-primary`, `text-muted-foreground` — never raw values like `bg-blue-500`.

## Critical Rules

Each links to a file with Incorrect/Correct code pairs.

### Styling & Tailwind -> [styling.md](./rules/styling.md)

- **`className` for layout, not styling.** Never override component colors/typography.
- **No `space-x-*`/`space-y-*`.** Use `flex` with `gap-*`.
- **Use `size-*` when width=height.** `size-10` not `w-10 h-10`.
- **Use `truncate` shorthand.** Not `overflow-hidden text-ellipsis whitespace-nowrap`.
- **No manual `dark:` overrides.** Use semantic tokens.
- **Use `cn()` for conditional classes.** No manual template literal ternaries.
- **No manual `z-index` on overlays.** Dialog, Sheet, Popover handle stacking.

### Forms & Inputs -> [forms.md](./rules/forms.md)

- **Forms use `FieldGroup` + `Field`.** Never raw `div` with `space-y-*`.
- **`InputGroup` uses `InputGroupInput`/`InputGroupTextarea`.** Never raw Input/Textarea inside InputGroup.
- **Buttons inside inputs use `InputGroup` + `InputGroupAddon`.**
- **Option sets (2-7 choices) use `ToggleGroup`.** Don't loop `Button` with manual active state.
- **`FieldSet` + `FieldLegend` for grouping related checkboxes/radios.**
- **Field validation uses `data-invalid` + `aria-invalid`.**

### Component Structure -> [composition.md](./rules/composition.md)

- **Items inside their Group.** `SelectItem` -> `SelectGroup`. `DropdownMenuItem` -> `DropdownMenuGroup`.
- **Use `asChild` (radix) or `render` (base) for custom triggers.** Check `base` field from info.
- **Dialog/Sheet/Drawer always need a Title.** Use `className="sr-only"` if visually hidden.
- **Use full Card composition.** CardHeader/CardTitle/CardDescription/CardContent/CardFooter.
- **Button has no `isPending`/`isLoading`.** Compose with `Spinner` + `data-icon` + `disabled`.
- **`TabsTrigger` must be inside `TabsList`.**
- **`Avatar` always needs `AvatarFallback`.**

### Use Components, Not Custom Markup -> [composition.md](./rules/composition.md)

- Callouts: `Alert`. Empty states: `Empty`. Toast: `sonner`. Dividers: `Separator`. Loading: `Skeleton`. Labels: `Badge`.

### Icons -> [icons.md](./rules/icons.md)

- **Icons in `Button` use `data-icon`.** `data-icon="inline-start"` or `data-icon="inline-end"`.
- **No sizing classes on icons inside components.** Components handle icon sizing via CSS.
- **Pass icons as objects, not string keys.**

## Component Selection

| Need | Use |
|---|---|
| Button/action | `Button` with variant |
| Form inputs | `Input`, `Select`, `Combobox`, `Switch`, `Checkbox`, `RadioGroup`, `Textarea`, `InputOTP`, `Slider` |
| Toggle 2-5 options | `ToggleGroup` + `ToggleGroupItem` |
| Data display | `Table`, `Card`, `Badge`, `Avatar` |
| Navigation | `Sidebar`, `NavigationMenu`, `Breadcrumb`, `Tabs`, `Pagination` |
| Overlays | `Dialog`, `Sheet`, `Drawer`, `AlertDialog` |
| Feedback | `sonner`, `Alert`, `Progress`, `Skeleton`, `Spinner` |
| Command palette | `Command` inside `Dialog` |
| Charts | `Chart` (wraps Recharts) |
| Layout | `Card`, `Separator`, `Resizable`, `ScrollArea`, `Accordion`, `Collapsible` |
| Menus | `DropdownMenu`, `ContextMenu`, `Menubar` |
| Tooltips/info | `Tooltip`, `HoverCard`, `Popover` |

## Key Fields from Project Context

- **`aliases`** -> import prefix. **`isRSC`** -> needs `"use client"`. **`tailwindVersion`** -> v3 vs v4.
- **`base`** -> `radix` or `base` (affects APIs). **`iconLibrary`** -> determines icon imports.
- **`resolvedPaths`** -> file-system destinations. **`framework`** -> routing conventions.

## Workflow

1. **Get context** — already injected. Refresh with `bunx shadcn@latest info`.
2. **Check installed** — before `add`, check `components` list or list `resolvedPaths.ui` dir.
3. **Find** — `bunx shadcn@latest search`. **Get docs** — `bunx shadcn@latest docs <component>`.
4. **Install** — `bunx shadcn@latest add`. Use `--dry-run` and `--diff` to preview updates.
5. **Fix third-party imports** — after adding community components, rewrite hardcoded paths to match project aliases.
6. **Review added files** — verify composition, imports, icon library match. Fix issues before moving on.
7. **Registry must be explicit** — never guess which registry. Ask if unspecified.
8. **Switching presets** — ask user: reinstall (`--force --reinstall`), merge (per-component `--diff`), or skip (`--force --no-reinstall`).

## Updating Components

Use `--dry-run` and `--diff` to merge upstream changes. **NEVER fetch raw files from GitHub.**

1. `bunx shadcn@latest add <component> --dry-run` — see affected files.
2. `bunx shadcn@latest add <component> --diff <file>` — see changes.
3. No local changes -> overwrite. Has local changes -> analyze and merge. **Never `--overwrite` without user approval.**

## Quick Reference

```bash
bunx shadcn@latest init --preset base-nova               # Init existing project
bunx shadcn@latest init --name my-app --preset base-nova # New project
bunx shadcn@latest add button card dialog                # Add components
bunx shadcn@latest add --all                             # Add all
bunx shadcn@latest search @shadcn -q "sidebar"           # Search
bunx shadcn@latest docs button dialog select             # Get docs URLs
bunx shadcn@latest view @shadcn/button                   # View uninstalled
bunx shadcn@latest add button --dry-run                  # Preview
bunx shadcn@latest add button --diff button.tsx          # Diff
```

**Presets:** `base-nova`, `radix-nova`. **Templates:** `next`, `vite`, `start`, `react-router`, `astro` (+ `--monorepo`), `laravel`.

## Detailed References

- [rules/forms.md](./rules/forms.md) — [rules/composition.md](./rules/composition.md) — [rules/icons.md](./rules/icons.md) — [rules/styling.md](./rules/styling.md) — [rules/base-vs-radix.md](./rules/base-vs-radix.md) — [cli.md](./cli.md) — [customization.md](./customization.md)
