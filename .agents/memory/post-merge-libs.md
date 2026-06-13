---
name: post-merge lib declarations
description: post-merge.sh must run typecheck:libs after db push, otherwise merged tasks that add DB tables leave stale type declarations
---

## Rule
`scripts/post-merge.sh` must always include `pnpm run typecheck:libs` after `pnpm --filter db push`.

Without it, any task that adds a new Drizzle table (e.g. `email_logs`, `push_tokens`) leaves the compiled `@workspace/db` declarations stale. Downstream packages then fail typecheck with "Module '@workspace/db' has no exported member 'X'".

The runtime still works (esbuild bundles from source, not declarations), but TS errors accumulate and mask real bugs.

Current correct script:
```bash
#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
pnpm run typecheck:libs
```

**Why:** Task agents only run the post-merge script, not full typechecks. If typecheck:libs is missing from the script, stale declarations pile up silently across merges.

**How to apply:** After any merge that adds a lib/db schema file, verify typecheck:libs ran. If not, run it manually before doing further work.
