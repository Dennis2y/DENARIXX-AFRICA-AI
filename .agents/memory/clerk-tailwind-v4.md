---
name: Clerk + Tailwind v4 setup
description: Required CSS layer order, vite config, and package version for Clerk + Tailwind v4 in denarixx frontend
---

## Rules

**CSS layer declaration** must come before `@import "tailwindcss"`:
```css
@layer theme, base, clerk, components, utilities;
@import "tailwindcss";
```

**vite.config.ts** — disable lightningcss optimization or Clerk nested `@layer` imports break in prod:
```ts
tailwindcss({ optimize: false })
```

**@clerk/themes version** — must be v1.x (not v2.x) when using `@clerk/react@6.x`.
- `@clerk/themes@2.x` ships `@clerk/shared@3.x` which conflicts with `@clerk/react@6.x`'s `@clerk/shared@4.x` → duplicate React error.
- Fix: `pnpm --filter @workspace/denarixx add @clerk/themes@1.x`

**Vite dedupe** — add to resolve.dedupe:
```ts
dedupe: ["react", "react-dom", "@clerk/shared", "@clerk/clerk-js"]
```

**Why:** Tailwind v4 reorders nested `@layer` at build time without `optimize: false`. Clerk themes v2/v1 split tracks clerk/shared major versions.

**How to apply:** Any time Clerk auth is added to a Tailwind v4 React+Vite app in this monorepo.
