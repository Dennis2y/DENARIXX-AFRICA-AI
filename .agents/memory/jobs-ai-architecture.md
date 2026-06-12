---
name: Jobs AI architecture
description: Key decisions for the Jobs AI page — match scoring, DB schema, CV integration, route ordering
---

# Jobs AI Architecture

## Match scoring weights
Skills 70pts + Location 15pts + Role 15pts (capped at 100). Location match awards full 15pts for any "remote" job. Role match uses word-overlap on user.role vs job.title. Returns `matchedSkills[]` and `missingSkills[]` arrays alongside `matchScore`.

**Why:** Skill overlap alone gives inflated scores for geographic mismatches; location and role bonuses reward truly relevant listings.

## saved_jobs table
Unique constraint on `(user_id, job_id)`. Uses `onConflictDoNothing()` on INSERT so double-save is idempotent. Foreign keys cascade on user/job delete.

## CV Builder → Tailor CV integration
CV Builder saves generated resume text to `localStorage["denarixx_last_cv"]` immediately after `setResult(data)`. Tailor CV modal reads this key and sends it to `POST /api/jobs/:id/tailor-cv`. If the key is absent, the modal shows a banner prompting the user to generate a CV first.

**How to apply:** Any feature needing the "last generated CV" should read this localStorage key, not a server-side store.

## Express route ordering
Static/prefix routes (`GET /saved`, `GET /my-applications`, `PATCH /applications/:appId/status`) must be registered BEFORE param routes (`POST /:id/apply`, `POST /:id/save`, etc.) to prevent Express matching "saved" as a job ID.

## AI calls
All AI calls in jobs.ts use `gpt-3.5-turbo`. JSON responses use a two-pass parse: try `JSON.parse(raw)` first, then regex-extract `{...}` and retry. This handles models that occasionally wrap JSON in markdown fences.
