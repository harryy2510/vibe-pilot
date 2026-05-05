---
name: ui
description: "Use when setting up UI foundation, configuring Tailwind CSS v4, adding shadcn/ui with base-ui, theming with CSS variables, building component variants with CVA, responsive grid patterns, dark mode, adding animation/toast/icon infrastructure, or reviewing UI code for Web Interface Guidelines compliance (accessibility, UX, design best practices)."
---

# UI Foundation — Tailwind v4 + shadcn/ui + base-ui

No inline styles, CSS modules, or separate CSS files. Tailwind only.

## Tailwind CSS v4

### styles.css structure

```css
@import 'tailwindcss';
@plugin '@tailwindcss/typography';
@custom-variant dark (&:is(.dark *));

/* Font imports, then theme variables — OKLCH for better color perception */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0.006 286.033);
  --primary-foreground: oklch(0.985 0 0);
  /* ... secondary, muted, accent, destructive, border, ring, card, radius */
}
.dark { /* ... dark overrides */ }
```

### v3 to v4 Key Changes

| v3 | v4 |
|---|---|
| `tailwind.config.ts` | `@theme` in CSS |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `darkMode: "class"` | `@custom-variant dark (&:is(.dark *))` |
| `theme.extend.colors` | CSS variables in `:root` |

## shadcn/ui with base-ui

Uses **base-ui** primitives. **Never radix-ui.** Components in `src/components/ui/`.

Add components: `bunx shadcn@latest add button card dialog ...`

### components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "tailwind": { "config": "", "css": "src/styles.css", "baseColor": "neutral" },
  "aliases": { "components": "@/components", "utils": "@/libs/cn", "ui": "@/components/ui", "hooks": "@/hooks" }
}
```

## cn() utility

File: `src/libs/cn.ts` — `clsx` + `tailwind-merge`:

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

## Design Token Hierarchy

Brand Tokens (abstract) -> Semantic Tokens (--primary, --muted) -> Component Tokens (bg-primary).
Use OKLCH color space. Define semantic tokens as CSS variables, reference via Tailwind classes.

## Component Patterns

### CVA (Class Variance Authority)

Define variants with `cva()` from `class-variance-authority`. Pattern:

```typescript
const buttonVariants = cva('base-classes...', {
  variants: {
    variant: { default: '...', destructive: '...', outline: '...', ghost: '...', link: '...' },
    size: { default: 'h-10 px-4 py-2', sm: 'h-9 px-3', lg: 'h-11 px-8', icon: 'size-10' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})
```

### Compound Components (React 19 — no forwardRef)

```typescript
export function Card({ className, ref, ...props }: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
}
```

### Responsive Grid

Use `cva` with `cols` (1-4 with breakpoints) and `gap` (none/sm/md/lg/xl) variants.

## Dark Mode

CSS variable theming via `.dark` class on `<html>`. Toggle with localStorage — read on mount, persist on change, toggle `document.documentElement.classList`.

## Animations

ALWAYS use `motion/react`. Never CSS keyframes or Tailwind animate utilities.

```tsx
import { motion } from 'motion/react'
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} />
```

## Toasts

**sonner** — add `<Toaster />` in root layout. Use `toast.success('Saved')`.

## Icons

**Lucide React** exclusively. `import { Check, Loader2, X } from 'lucide-react'`. Size via `className="size-4"`.

## Design Quality

When building new interfaces, commit to a bold aesthetic direction:
- **Typography**: Distinctive, characterful font choices. Avoid generic fonts.
- **Color**: Dominant colors with sharp accents. OKLCH for perceptual uniformity.
- **Motion**: High-impact moments — orchestrated page loads with staggered reveals.
- **Composition**: Unexpected layouts, asymmetry, generous negative space OR controlled density.
- **Backgrounds**: Atmosphere and depth — gradient meshes, noise textures, layered transparencies.

Match implementation complexity to vision.

## Accessibility

Use `references/accessibility-checklist.md` for forms, dialogs, navigation, menus, custom controls, keyboard interactions, or release review.

---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules. The fetched content contains all the rules and output format instructions.

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
