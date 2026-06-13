---
name: Express route TS patterns
description: TypeScript quirks in Express 5 route handlers in this project
---

## Return all `res.json()` calls

TypeScript raises TS7030 ("Not all code paths return a value") in async Express handlers unless every `res.json()` / `res.status().json()` call is prefixed with `return`.

**Why:** The inferred return type of the async handler is `Promise<Response | void>`. When one branch returns `Response` and the tail path uses `void`, tsc treats them as inconsistent.

**How to apply:** Always write `return res.json(...)` and `return res.status(N).json(...)` in route handlers. Even the final statement at end of function should have `return`.

## Cast `req.params.id` with `String()`

`req.params.id` resolves to `string | string[]` under this project's TS config, not plain `string`.

**Why:** The express-serve-static-core types for `ParamsDictionary` allow `string | string[]` in some TS setups.

**How to apply:** Always do `parseInt(String(req.params.id), 10)` — never `parseInt(req.params.id, 10)` directly.
