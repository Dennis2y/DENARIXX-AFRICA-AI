---
name: Jobs.tsx naming conflict
description: Variable name clash between useSearch() hook and the search filter state in Jobs.tsx
---

## Rule
When importing `useSearch` from wouter in `Jobs.tsx`, store it as `urlSearch`, not `search`.

**Why:** `Jobs.tsx` already declares `const [search, setSearch] = useState("")` for the job title filter input. Using the same name `search` for the wouter `useSearch()` result causes TS2451 "Cannot redeclare block-scoped variable" at typecheck time.

## How to apply
```typescript
const urlSearch = useSearch(); // NOT: const search = useSearch()
const [tab, setTab] = useState<Tab>(() => {
  const t = new URLSearchParams(urlSearch).get("tab");
  return (["browse", "applications", "saved"].includes(t ?? "") ? t as Tab : "browse");
});
```
