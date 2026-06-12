# DENARIXX AFRICA AI — Functional Test Report

**Date:** 2026-06-12  
**Tester:** Automated (API probing + Playwright browser tests + code review)  
**Environment:** Development (local, `pnpm run dev`)  
**API Base:** `http://localhost:80/api`  
**Frontend Base:** `http://localhost:80/`

---

## Executive Summary

| Feature | Status |
|---------|--------|
| 1. Profile Creation | ⚠️ Partially Works |
| 2. SkillSwap Listing Creation | ⚠️ Partially Works |
| 3. Skill Matching | ⚠️ Partially Works |
| 4. Connection Requests | ⚠️ Partially Works |
| 5. Connection Acceptance | ⚠️ Partially Works |
| 6. Messaging | ⚠️ Partially Works |
| 7. DENA AI | ⚠️ Partially Works |
| 8. CV Builder | ⚠️ Partially Works |
| 9. Job Applications | ⚠️ Partially Works |
| Landing Page | ✅ Works |
| Authentication (Clerk) | ✅ Works |
| API Health | ✅ Works |

**Status key:**  
✅ Works — fully confirmed end-to-end  
⚠️ Partially Works — route/API exists and is correctly structured, but full authenticated browser flow was not completable due to a JIT provisioning bug  
❌ Broken — confirmed error or crash  
🔲 Missing — not implemented

---

## Infrastructure Notes

- All 23 frontend routes are registered in the Wouter router.
- All API route modules are mounted in `routes/index.ts`.
- Auth-gating on all protected endpoints confirmed via HTTP 401 response.
- Test agent Playwright sessions hit infrastructure limits (10 iteration cap + intermittent worker spawn errors), preventing complete authenticated flows.
- **Critical bug found:** JIT user provisioning uses a plain `INSERT` without `ON CONFLICT` — causes `500 duplicate key value violates unique constraint "users_email_unique"` for any user who logs in more than once. This affects ALL authenticated features.

---

## Feature-by-Feature Results

---

### 1. Profile Creation

**Status: ⚠️ Partially Works**

**Evidence:**
- Profile page (`/profile`) renders correctly — confirmed via Playwright screenshot showing form with Name, Bio, Location, LinkedIn fields and avatar picker.
- `PATCH /api/users/me` returns `401` for unauthenticated requests ✅
- Profile save triggered a success toast (observed in browser test) ✅
- **BUG:** After sign-in, `GET /api/users/me` fails with `500` — error: `duplicate key value violates unique constraint "users_email_unique"`. The JIT provisioning code attempts `INSERT INTO users VALUES (...)` without an `ON CONFLICT` clause, causing every repeated login to throw a 500.
- Profile changes do not persist after navigation because the re-fetch after save fails.

**Screenshot:** `test-evidence/profile-page.jpeg` — Profile Edit page with Basic Info, Bio, Location, Links & Social sections visible.

**Root Cause:**
```typescript
// artifacts/api-server/src/routes/users.ts ~line 34
await db.insert(usersTable).values({ clerkUserId, email, name })
// Missing: .onConflictDoNothing() or .onConflictDoUpdate(...)
```

**What works:** Page renders, form fields filled, save call fires.  
**What doesn't:** Profile data fails to load/save for any user who has logged in previously (duplicate key error).

---

### 2. SkillSwap Listing Creation

**Status: ⚠️ Partially Works**

**Evidence:**
- Frontend route `/skillswap` registered in router ✅
- Page redirects unauthenticated users to Clerk sign-in ✅ (correct auth-gate behavior)
- `POST /api/skillswap/listings` → `401` for unauthenticated ✅
- `GET /api/skillswap/my-listings` → `401` for unauthenticated ✅
- `GET /api/skillswap/listings` (public) → `{"listings":[],"total":0}` — no listings yet (empty state expected) ✅
- Listing form UI exists in `SkillSwap.tsx` with Skill, Type (offering/seeking), Level, Description fields
- **Full browser flow not completable** due to JIT provisioning bug (authenticated flows fail)

**What works:** Route, API endpoints, form UI code exists, auth-gating correct.  
**What doesn't:** Cannot verify full create/list cycle due to JIT bug on auth.

---

### 3. Skill Matching

**Status: ⚠️ Partially Works**

**Evidence:**
- `GET /api/skillswap/matches` → `401` for unauthenticated ✅ (endpoint exists and is auth-gated)
- Route handler uses AI (GPT-3.5-turbo) to generate match suggestions based on user profile and skills
- AI Matches tab exists in SkillSwap UI (`SkillSwap.tsx`)
- **Full browser flow not completable** due to JIT provisioning bug
- DB currently has 0 SkillSwap listings, so matches would return empty/minimal results regardless

**What works:** Endpoint exists, auth-gated correctly, UI tab exists.  
**What doesn't:** Cannot verify AI match output end-to-end; DB has no listings for matching.

---

### 4. Connection Requests

**Status: ⚠️ Partially Works**

**Evidence:**
- `POST /api/skillswap/connections` → `401` for unauthenticated ✅
- `GET /api/skillswap/connections` → `401` for unauthenticated ✅
- DB table `skill_swap_connections` confirmed to exist (in schema)
- Connections UI section exists in SkillSwap page
- **Full browser flow not completable** due to JIT provisioning bug and two-user requirement

**What works:** API routes exist, auth-gated, DB schema in place.  
**What doesn't:** Cannot verify sending a connection request end-to-end.

---

### 5. Connection Acceptance

**Status: ⚠️ Partially Works**

**Evidence:**
- `PATCH /api/skillswap/connections/:id` → `401` for unauthenticated ✅
- Route handler logic reads `{ status: "accepted" | "declined" }` from body and updates connection record
- **Full browser flow not completable** due to JIT provisioning bug and two-user requirement

**What works:** API endpoint exists and is auth-gated.  
**What doesn't:** Full accept/decline flow not verified.

---

### 6. Messaging

**Status: ⚠️ Partially Works**

**Evidence:**
- Frontend route `/messages` registered, redirects to Clerk sign-in ✅
- `GET /api/messages/inbox` → `401` ✅
- `GET /api/messages/unread-count` → `401` ✅
- `GET /api/messages/:partnerId` → `401` ✅
- `POST /api/messages/:partnerId` → `401` ✅
- DB table `messages` exists, count = 0 (no messages yet — expected)
- Messages UI (`Messages.tsx`) implements inbox list + thread view
- **Full browser flow not completable** due to JIT provisioning bug and two-user requirement

**What works:** All 4 messaging API routes exist, correctly auth-gated, DB schema present, UI exists.  
**What doesn't:** End-to-end send/receive flow not verified.

---

### 7. DENA AI

**Status: ⚠️ Partially Works**

**Evidence:**
- Frontend route `/dena` registered, redirects to Clerk sign-in ✅
- `POST /api/dena/chat` exists (does NOT require auth — unauthenticated users can chat, auth enables persistence) ✅
- `GET /api/dena/conversations` → `401` ✅
- `DELETE /api/dena/conversations/:id` → `401` ✅
- DB tables `conversations` and `messages` confirmed in schema
- DENA chat UI uses streaming SSE with typewriter effect
- Conversation persistence to DB confirmed in code when authenticated
- **Full browser interactive test not completable** due to testing infrastructure limits

**What works:** Route exists, streaming chat API exists (no-auth allowed), conversation history API properly auth-gated, DB schema in place.  
**What doesn't:** End-to-end streaming chat response not browser-verified in this run; conversation persistence not verified.

---

### 8. CV Builder

**Status: ⚠️ Partially Works**

**Evidence:**
- Frontend route `/cv-builder` registered, redirects to Clerk sign-in ✅
- `POST /api/cv-builder/parse` → `401` ✅ (auth-gated)
- `POST /api/cv-builder/generate` → `401` ✅ (auth-gated, confirmed via POST — earlier GET test was misleading)
- `POST /api/cv-builder/assist` → `401` ✅
- `POST /api/cv-builder/tailor` → `401` ✅
- Newly built 3-tier PDF OCR pipeline (pdf-parse v2 → pdfjs-dist → tesseract.js WASM)
- CV form UI with Name, Role, Summary, Experience, Education, Skills, Tone, Language, Photo fields
- 5 print templates (Professional, Executive, Tech, Creative, Minimal)
- ATS scoring, AI assist buttons, multi-language support (12 languages)
- **Full browser generate flow not verified** due to JIT provisioning bug

**What works:** All 4 API routes properly mounted and auth-gated, form UI complete, multi-tier OCR pipeline implemented.  
**What doesn't:** Full generate/preview flow not end-to-end verified in browser.

---

### 9. Job Applications

**Status: ⚠️ Partially Works**

**Evidence:**
- Frontend route `/jobs` registered, redirects to Clerk sign-in ✅
- `GET /api/jobs/` (public) returns 12 real African tech company jobs ✅

| ID | Title | Company | Salary |
|----|-------|---------|--------|
| 1 | Senior Frontend Engineer | Andela | $4,000–6,000/mo |
| 2 | Data Scientist | Flutterwave | ₦600k–900k/mo |
| 3 | Product Designer | M-Pesa Africa | KES 250k–400k/mo |
| 4 | Backend Engineer | Paystack | ₦500k–800k/mo |
| 5 | AI/ML Engineer | InstaDeep | $3,500–5,500/mo |
| 6 | Digital Marketing Manager | Jumia | $2,000–3,500/mo |
| 7 | Mobile Developer | Chipper Cash | $3,000–5,000/mo |
| 8 | DevOps / Cloud Engineer | Safaricom PLC | KES 300k–500k/mo |
| 9 | Product Manager | Wave Mobile Money | $4,000–7,000/mo |
| 10 | Junior Software Developer | Turing | $1,500–2,500/mo |
| 11 | Cybersecurity Analyst | Standard Bank | R 45k–70k/mo |
| 12 | Full-Stack Developer | Remoteli.io | $30–60/hr |

- `POST /api/jobs/:id/apply` → `401` ✅
- `GET /api/jobs/my-applications` → `401` ✅
- Jobs UI (`Jobs.tsx`) shows match score badges and Apply button
- DB table `job_applications` confirmed in schema
- **Full apply flow not verified** due to JIT provisioning bug

**What works:** Public jobs feed (12 jobs), route registered, all API endpoints properly gated.  
**What doesn't:** End-to-end apply + status tracking not verified.

---

## Additional Feature Verification

### Landing Page
**Status: ✅ Works**  
- Renders with hero, waitlist counter (8 signups), navigation, "Get Started Free" CTA, pricing section.
- Clerk sign-in/sign-up links work.

![Landing Page](test-evidence/) *(see live at /home)*

### Authentication (Clerk)
**Status: ✅ Works**  
- Sign-in (`/sign-in`) and sign-up (`/sign-up`) pages render with DENARIXX branding.
- All 17 protected routes redirect unauthenticated users to Clerk sign-in.
- Google OAuth option available.

### API Health
**Status: ✅ Works**  
`GET /api/healthz` → `{"status":"ok"}`

### Community Page
**Status: ⚠️ Partially Works**  
- `GET /api/community/members` returns members (1 currently, with null name — data quality issue)
- Frontend route `/community` registered ✅
- Full browser test not run

### Interview Coach
**Status: ⚠️ Partially Works**  
- Route `/interview-coach` registered, redirects to Clerk sign-in ✅
- All 4 API endpoints exist and return 401 for unauthenticated ✅
- DB schema for interview sessions exists
- Full browser test not run

### Leaderboard
**Status: ⚠️ Partially Works**  
- Route `/leaderboard` registered ✅
- Waitlist/referral APIs exist ✅

---

## Bugs Discovered

### BUG-001 — Critical: JIT User Provisioning Duplicate Key Error
**Severity:** High — affects ALL authenticated features  
**File:** `artifacts/api-server/src/routes/users.ts` ~line 34  
**Symptom:** `GET /api/users/me` returns 500 with `duplicate key value violates unique constraint "users_email_unique"` for any user who signs in more than once.  
**Root Cause:** JIT provisioning does `INSERT INTO users VALUES (...)` without `ON CONFLICT DO NOTHING/UPDATE`. Works for first login, breaks on all subsequent logins.  
**Fix:** Add `.onConflictDoNothing()` or `.onConflictDoUpdate({ target: usersTable.clerkUserId, set: { email, name } })`.

### BUG-002 — Data: Community Member with Null Name
**Severity:** Low  
**Symptom:** Community members API returns `{"name": null}` for the first user record.  
**Root Cause:** Test user was created without a name being synced from Clerk to the users table.  
**Fix:** Ensure name sync in JIT provisioning and add a fallback display in community UI.

### BUG-003 — Test Infrastructure: Playwright Iteration Limit
**Severity:** Testing only (not production)  
**Symptom:** Playwright testing agent hits 10-step iteration limit, preventing full E2E verification of authenticated flows.  
**Impact on testing:** Could not browser-verify DENA AI chat response, CV Builder generation, Jobs Apply button, SkillSwap listing creation, Connection request flow, or Messaging.

---

## What Could Not Be Tested

The following flows require either:
(a) A resolved JIT provisioning bug (BUG-001) to allow authenticated API calls, or  
(b) Longer Playwright test sessions

| Flow | Blocker |
|------|---------|
| DENA AI chat response quality | BUG-001 + Playwright limit |
| CV Builder generate output | BUG-001 + Playwright limit |
| SkillSwap listing create/view cycle | BUG-001 + Playwright limit |
| AI Skill Matching suggestions | BUG-001 + no seeded listings |
| Connection request send + accept | BUG-001 + requires 2 users |
| Send/receive message thread | BUG-001 + requires 2 users |
| Job apply + My Applications tab | BUG-001 + Playwright limit |
| Profile persistence after save | BUG-001 (save fires but reload fails) |

---

## Recommended Fixes Before Next Test Run

1. **Fix BUG-001 (JIT provisioning)** — one-line fix in `users.ts`, change INSERT to use `onConflictDoNothing()` or `onConflictDoUpdate()`. This unlocks all authenticated features.
2. **Seed test data** — add 2–3 skill listings, 1–2 connection records, and 1–2 messages via migration seed for realistic testing.
3. **Add a community user** with a proper name to fix BUG-002.

---

## Test Artifacts

| File | Description |
|------|-------------|
| `test-evidence/profile-page.jpeg` | Profile Edit page — form renders correctly (Name, Bio, Location, Links) |
| `test-evidence/profile-save-attempt.jpeg` | Profile page after save attempt — shows 0% completion due to BUG-001 |
| `test-evidence/dashboard-auth-redirect.jpeg` | Dashboard redirecting to Clerk sign-in (correct unauth behavior) |

---

*Report generated: 2026-06-12. Testing method: API curl probing (all public endpoints), HTTP status checks (all authenticated endpoints), Playwright browser tests (partial — 2 sessions), code review (route registration, API mounting, DB schema), screenshot verification.*
