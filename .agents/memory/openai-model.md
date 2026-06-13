---
name: OpenAI model constraint
description: Which OpenAI models work in this project and why
---

## Rule
Use **gpt-4o-mini** for all AI endpoints in this project.

**Why:** Initially only gpt-3.5-turbo was confirmed working. As of June 2026, the user explicitly requested switching to gpt-4o-mini and it built and ran successfully — confirmed working. Do not use gpt-3.5-turbo (outdated) or gpt-4 / gpt-4-turbo (may still be blocked at project level).

## How to apply
Any call to the OpenAI API in `artifacts/api-server/src/routes/` must use `model: "gpt-4o-mini"`.
