---
name: DB schema export requirement
description: All Drizzle tables must be re-exported from lib/db/src/schema/index.ts for drizzle-kit push to create them
---

## Rule

Any new table added in `lib/db/src/schema/*.ts` MUST be added to `lib/db/src/schema/index.ts` with `export * from "./<file>"`.

Then run: `pnpm --filter @workspace/db run push`

**Why:** `drizzle-kit push` reads the schema via `lib/db/src/schema/index.ts` as the entry point. Tables not exported there are invisible to migrations.

**How to apply:** Every time a new schema file is created.
