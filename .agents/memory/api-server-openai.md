---
name: API server OpenAI import pattern
description: How to use OpenAI in api-server routes without causing build failures or startup crashes.
---

Never import `openai` directly at the top of an api-server route file — it is not in the api-server's dependencies and will cause an esbuild resolution error.

**Why:** The api-server bundles with esbuild and requires all imports to resolve at build time. `openai` lives in `lib/integrations-openai-ai-server`, not in `artifacts/api-server`.

**How to apply:** Use a dynamic require inside the handler, guarded by an API key check:

```ts
const apiKey = process.env["OPENAI_API_KEY"];
if (!apiKey) {
  // fall back to non-AI behavior
  return;
}
const { openai } = require("@workspace/integrations-openai-ai-server");
// use openai here
```

**Orval inline body schema collision:** Orval generates both a Zod schema and a TS type for inline request bodies. If both `generated/api.ts` and `generated/types/` export the same name, `api-zod/src/index.ts` (`export * from ...` both) throws TS2308. Fix: replace any inline `schema: { type: object, ... }` in the OpenAPI spec requestBody with a named `$ref: "#/components/schemas/SomeName"` and add that name to the components section.
