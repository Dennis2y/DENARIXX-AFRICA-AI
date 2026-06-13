# DENARIXX AFRICA AI — Integration Test Report

**Date:** 13 June 2026  
**Tester:** Agent (automated code + flow analysis)  
**Scope:** End-to-end flow — Create Profile → Generate CV → Jobs AI → Apply → Messages

---

## Summary

| Step | Description | Status |
|------|-------------|--------|
| 1 | Create user profile | ✅ Works |
| 2 | Generate CV | ✅ Works |
| 3 | Save generated CV | ⚠️ Partially Works |
| 4 | Open Jobs AI | ✅ Works |
| 5 | Compute match scores using generated CV | ✅ Works |
| 6 | Apply for a job | ✅ Works |
| 7 | Save application | ✅ Works |
| 8 | View application in My Applications | ✅ Works |
| 9 | Receive employer message | ❌ Missing |
| 10 | View conversation in Messages | ❌ Missing (job context) |

**7 of 10 steps functional. 5 broken module connections fixed in this session.**

---

## Detailed Step Results

### Step 1 — Create user profile ✅ Works

**Route:** `/profile`  
**API:** `PATCH /api/users/me` + `PUT /api/users/me/skills`

- Name, role, bio, location, website, Twitter, LinkedIn, GitHub fields all connected to DB.
- Skills management with suggested quick-add chips works correctly.
- Avatar upload via presigned GCS URL works.
- Profile completion bar (0–100%) reflects filled fields.
- JIT provisioning on first login via `GET /api/users/me` (upsert on email) prevents duplicate key errors.

**✅ Fix applied:** After save, user now sees **"Find matching jobs →"** link alongside "Dashboard" instead of silently redirecting. This closes the Profile → Jobs gap.

---

### Step 2 — Generate CV ✅ Works

**Route:** `/cv-builder`  
**API:** `POST /api/cv-builder/generate`

- 6-step wizard: personal info → experience → education → skills → review → preview.
- AI assist buttons per section (rewrite, suggest skills, ATS check) all connected.
- 8 visual templates (sidebar-dark, sidebar-teal, modern, photo-right, classic, compact, minimal, two-column).
- Tone selector (professional / creative / executive) and 12-language support.
- Cover letter generated alongside resume in single API call.

---

### Step 3 — Save generated CV ⚠️ Partially Works

**Storage:** `localStorage["denarixx_last_cv"]` (line 1072, `CvBuilder.tsx`)

**What works:**
- CV is saved to browser localStorage immediately after generation.
- Jobs AI reads this localStorage key and passes CV skills to match scoring (`extractCvSkills()`).
- Download as PDF (print-to-PDF via new window) works.
- Copy to clipboard works.

**What's limited:**
- CV is **not persisted to the server** — lost on device change, browser clear, or private browsing.
- No "saved CVs" library — only the most recent CV is kept.

**✅ Fix applied:** Step 6 ("Your CV is Ready") now shows a prominent **"Search Jobs AI →"** and "Practice Interview" CTA banner directly below the header, making the next step immediately visible rather than leaving users on a dead-end page.

> **Pending fix (separate task):** Server-side CV persistence — tracked as Task #10 (Save applied/saved jobs and CV data so they persist between sessions).

---

### Step 4 — Open Jobs AI ✅ Works

**Route:** `/jobs`  
**Entry points:**
- Dashboard → "Jobs AI" module card
- Direct URL `/jobs`

15 seed jobs loaded (12 external with `externalApplyUrl`, 3 DENARIXX-internal).

**✅ Fix applied:** Dashboard stat cards are now **clickable**:
- "Skills" → `/profile`
- "Connections" → `/skillswap`
- "Applications" → `/jobs?tab=applications` (direct deep-link to My Applications tab)

**✅ Fix applied:** Jobs page now reads the `?tab=` URL parameter on load. Navigating to `/jobs?tab=applications` opens directly on the My Applications tab — no extra click needed.

---

### Step 5 — Compute match scores using generated CV ✅ Works

**API:** `GET /api/jobs?cvSkills=...&targetTitle=...`

Match scoring uses a weighted model:
- Skill overlap between job requirements and user profile skills (50 pts)
- CV skills extracted from localStorage (additional boost)
- Job title similarity to target role (30 pts)
- Location match (20 pts)

**Scoring logic:** If user has no profile skills but has a CV in localStorage, `extractCvSkills()` parses the CV text and passes skill names as `?cvSkills=` query param. The `hasMatchContext` flag ensures scores show whenever either profile skills OR CV skills are present.

Color-coded badges: 🟢 80%+ · 🟡 50–79% · 🔴 <50%

---

### Step 6 — Apply for a job ✅ Works

**Internal DENARIXX jobs** (`source: "denarixx"`):
- "Apply Now" button opens an `ApplicationModal`.
- Cover letter field with AI-generate button (calls `POST /api/cv-builder/generate` with `coverLetterOnly` flag).
- Submission calls `POST /api/jobs/:id/apply`.

**External jobs** (`source: "external"`, has `externalApplyUrl`):
- "Apply Externally ↗" button opens the company's career page in a new tab.
- After clicking, a prompt asks "Mark as applied on DENARIXX?" — if confirmed, records the application internally so it appears in My Applications.

---

### Step 7 — Save application ✅ Works

**API:** `POST /api/jobs/:id/apply`  
**DB:** `job_applications` table (userId, jobId, status, coverLetter, appliedAt)

Application is saved to PostgreSQL immediately. Returns 409 if already applied (prevents duplicates). Status defaults to `"applied"`.

---

### Step 8 — View application in My Applications ✅ Works

**Route:** `/jobs?tab=applications`  
**API:** `GET /api/jobs/my-applications`

Each application card shows:
- Job title, company, location, type, remote flag
- Applied date
- Cover letter (collapsed, expandable)
- **Status Pipeline:** `applied → reviewing → interview → offered → rejected`
  - Users can self-advance status to track progress
  - Email notification fires on each status change (via Resend, Task #2)

**✅ Fix applied:** Each application card now has an **"Ask DENA for coaching"** link that opens the DENA AI assistant — the user can discuss interview prep, negotiation, or follow-up strategy for that specific application. External jobs also show a **"View job posting"** link.

---

### Step 9 — Receive employer message ❌ Missing

**Status:** Not built. No employer portal exists on the platform yet.

**Root cause:** DENARIXX currently has no employer-side functionality. Jobs are seeded server-side, not posted by real employers via a UI. There is no employer account type, no employer dashboard, and no messaging channel from employer to applicant.

**Current proxy:** When application status changes (e.g. to `reviewing`, `interview`, `offered`), an automated email is sent to the candidate via Resend (Task #2). This is the MVP stand-in for "employer communication."

**What's needed to fully implement this step:**
1. Employer account type + employer dashboard (Task #4, currently proposed)
2. `employer_messages` table or reuse of `direct_messages` with a `jobApplicationId` foreign key
3. Notification badge on Messages page for job-related messages
4. API route: `POST /api/jobs/applications/:appId/messages`

---

### Step 10 — View conversation in Messages ❌ Missing (job context)

**Status:** Messages page (`/messages`) fully works for **SkillSwap P2P** conversations — not for job-related threads.

**What exists:**
- Full inbox + thread UI at `/messages`
- `direct_messages` table with `fromUserId`, `toUserId`, `content`, `isRead`
- 8-second polling for real-time feel
- Entry point: SkillSwap → accepted connection → "Message" button → `/messages?partner={id}`

**What's missing for job context:**
- No `jobApplicationId` link on the `direct_messages` table
- No way to open a job-related conversation from My Applications
- No employer user ID to message (employers don't have accounts yet)

**Dependency:** This step is fully blocked by Step 9 (employer accounts).

---

## Broken Module Connections — Fixes Applied

| Connection | Problem | Fix |
|------------|---------|-----|
| **CV Builder → Jobs** | No CTA after CV generation; user stranded on step 6 | Added "Search Jobs AI →" + "Practice Interview" banner in CV step 6 |
| **Profile → Jobs** | After save, only Dashboard redirect with no onward path | Added "Find matching jobs →" link in post-save state |
| **Dashboard stat → My Applications** | "Applications: N" count was plain text, not clickable | Stat card now links to `/jobs?tab=applications` |
| **URL deep-link → My Applications tab** | `/jobs?tab=applications` ignored the `?tab=` param | Jobs page now reads URL param for initial tab on mount |
| **My Applications → DENA AI** | No coaching path after applying; users left without next steps | "Ask DENA for coaching" link added to each application card |

---

## Pre-existing Typecheck Issues (Not Introduced by This Session)

| File | Error | Action |
|------|-------|--------|
| `src/components/ui/spinner.tsx` | SVGSVGElement `ref` type mismatch | Pre-existing, not blocking runtime |
| `src/components/ui/calendar.tsx` | HTMLDivElement `Ref` type mismatch | Pre-existing, not blocking runtime |

Both are UI library component type drift issues unrelated to the integration flow.

---

## Platform Cohesion Assessment

| Flow segment | Before this session | After this session |
|---|---|---|
| Profile → Jobs | Disconnected (no CTA) | ✅ Connected |
| CV Builder → Jobs | Disconnected (no CTA) | ✅ Connected |
| Dashboard → My Applications | Not linked | ✅ Deep-linked |
| My Applications → Coaching | No path | ✅ DENA AI link |
| Jobs → Employer Messages | Missing | ❌ Needs employer portal (Task #4) |
| Jobs → Messages (general) | No entry point | ❌ Blocked by employer accounts |

---

## Recommended Next Steps (Priority Order)

1. **Task #10** — Server-side CV persistence (fixes Step 3 partial)
2. **Task #4** — Employer portal & job posting (unblocks Steps 9 + 10)
3. After employer portal: link `job_applications` to `direct_messages` so conversation threads appear under Messages
4. Add unread badge on Dashboard for job-related notifications
