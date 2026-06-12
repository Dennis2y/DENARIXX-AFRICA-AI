---
name: OpenAI direct key setup
description: This project uses OPENAI_API_KEY directly, not the Replit AI Integrations proxy
---

## Decision

The Replit AI Integrations proxy for OpenAI (`setupReplitAIIntegrations`) required phone verification and was rejected. User chose to provide their own key.

**Client file:** `lib/integrations-openai-ai-server/src/client.ts` — uses `process.env.OPENAI_API_KEY` (not `AI_INTEGRATIONS_OPENAI_BASE_URL`/`AI_INTEGRATIONS_OPENAI_API_KEY`).

**Secret name:** `OPENAI_API_KEY` — user must add this to Replit Secrets for DENA AI to work.

**Why:** Do NOT retry `setupReplitAIIntegrations`. Do NOT reference AI_INTEGRATIONS_* env vars in this project.

**How to apply:** Any time OpenAI is called in this project, import from `@workspace/integrations-openai-ai-server` which reads `OPENAI_API_KEY`.
