---
name: OpenAI model constraint
description: Which OpenAI models work in this project
---

## Rule
Only `gpt-3.5-turbo` works. The project (or API key) blocks the GPT-4 family (gpt-4, gpt-4o, gpt-4-turbo, etc.).

**Why:** Confirmed by runtime errors when GPT-4 models were attempted. The API key/project config does not have GPT-4 access.

## How to apply
Any call to the OpenAI API in `artifacts/api-server/src/routes/` must use `model: "gpt-3.5-turbo"`. Do not upgrade to gpt-4 variants even if the user asks — explain the constraint and ask them to verify their API key permissions first.
