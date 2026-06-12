# DENARIXX AFRICA AI — First-User Journey Status

_Last updated: 2026-06-12_

---

## Journey Overview

```
Sign Up → Profile → DENA AI → SkillSwap AI → CV Builder → Apply for Jobs
```

---

## Step 1: Sign Up ✅ WORKING

| What | Status |
|---|---|
| Clerk sign-up page at `/sign-up` | ✅ Functional |
| Email/password + Google OAuth | ✅ Functional |
| After signup → redirect to `/dashboard` | ✅ Functional |
| Auto-create DB user record on first authenticated request | ✅ Functional |

**Notes:**
- Welcome email (Resend) is not wired up — `RESEND_API_KEY` is unset. Non-blocking for MVP.
- After first sign-in, Dashboard shows a "Complete your profile" call-to-action card when `skillCount === 0`.

---

## Step 2: Create Profile ✅ WORKING (fixed this session)

| What | Status |
|---|---|
| Profile page at `/profile` | ✅ Functional |
| Loads existing DB data on mount (previously broken) | ✅ Fixed |
| Pre-fills bio, role, location, links from DB | ✅ Working |
| Pre-fills saved skills from DB | ✅ Working |
| Skill chips with level selector | ✅ Working |
| Quick-add suggested skills | ✅ Working |
| PATCH `/api/users/me` + PUT `/api/users/me/skills` on save | ✅ Working |
| Profile completion progress bar | ✅ Working |
| Post-save guidance message ("Back to Dashboard") | ✅ Working |

**Impact:** Profile data now flows to every downstream step (DENA context, CV Builder pre-fill, Jobs AI match score).

---

## Step 3: DENA AI ✅ WORKING

| What | Status |
|---|---|
| Full-page chat at `/dena` | ✅ Functional |
| Conversation history sidebar | ✅ Working |
| DB persistence (conversations + messages) | ✅ Working |
| User profile context injected into system prompt | ✅ Working |
| Streaming SSE responses | ✅ Working |
| Delete conversation | ✅ Working |
| Floating DENA widget on all other pages | ✅ Working |
| New conversation on first visit prompt suggestions | ✅ Working |

**Notes:** Conversations are scoped to Clerk user ID. Profile data (name, role, skills, bio, location) personalises every DENA response.

---

## Step 4: SkillSwap AI ✅ WORKING

| What | Status |
|---|---|
| SkillSwap page at `/skillswap` | ✅ Functional |
| Browse all skill listings | ✅ Working |
| Create a skill listing (offer/seek) | ✅ Working |
| AI-powered matching (by skill overlap) | ✅ Working |
| Send / accept / reject connections | ✅ Working |
| View accepted connections | ✅ Working |
| Dashboard "Connections" stat reflects real data | ✅ Working |

**Notes:** Connection request is a one-direction follow; accept/reject on the receiving end changes status.

---

## Step 5: Generate CV ✅ WORKING (improved this session)

| What | Status |
|---|---|
| CV Builder at `/cv-builder` | ✅ Functional |
| Pre-fills name from Clerk + profile | ✅ Fixed (was Clerk-only) |
| Pre-fills current role from profile | ✅ Fixed |
| Pre-fills skills from profile DB | ✅ Fixed |
| Skill chip input (add/remove) | ✅ Working |
| Tone selector (Professional / Creative / Executive) | ✅ Working |
| GPT-4o-mini resume + cover letter generation | ✅ Working |
| Resume tab + Cover Letter tab | ✅ Working |
| Copy to clipboard | ✅ Working |
| Print as PDF | ✅ Working |

**Notes:** If the user hasn't added skills in the CV Builder form, the API falls back to their saved profile skills automatically.

---

## Step 6: Apply for Jobs ✅ WORKING (built this session)

| What | Status |
|---|---|
| Jobs AI page at `/jobs` | ✅ Functional |
| 12 seeded African tech jobs (Andela, Flutterwave, Paystack, M-Pesa, etc.) | ✅ Seeded |
| AI match score per job based on profile skills | ✅ Working |
| Jobs sorted by match score | ✅ Working |
| "Top AI Matches" section for ≥60% matches | ✅ Working |
| One-click Apply button | ✅ Working |
| Duplicate application prevention | ✅ Working |
| "Applied" badge on applied jobs | ✅ Working |
| My Applications tab with status tracking | ✅ Working |
| Search by title / company / skill | ✅ Working |
| Filter by level (Junior / Mid / Senior) | ✅ Working |
| Filter by type (Full-time / Contract / Remote) | ✅ Working |
| Warning card to complete profile if no skills set | ✅ Working |
| DB tables: `jobs`, `job_applications` | ✅ Pushed |
| API: `GET /api/jobs`, `POST /api/jobs/:id/apply`, `GET /api/jobs/my-applications` | ✅ Mounted |

---

## Dashboard Integration ✅ WORKING

| Stat / Module | Status |
|---|---|
| Skills count (live from API) | ✅ Working |
| Connections count (live from API) | ✅ Working |
| Applications count (live from `/api/jobs/my-applications`) | ✅ Fixed (was hardcoded 0) |
| DENA AI module → `/dena` | ✅ Linked |
| SkillSwap AI module → `/skillswap` | ✅ Linked |
| CV Builder module → `/cv-builder` | ✅ Linked |
| Jobs AI module → `/jobs` | ✅ Linked (was "coming soon") |
| Community module | ⚪ Coming Soon (badge shown) |
| Leaderboard module | ✅ Linked |

---

## Known Gaps / Future Work

| Item | Priority | Notes |
|---|---|---|
| Welcome email on sign-up | Low | Needs `RESEND_API_KEY` set in env |
| Reputation score logic | Medium | Score column exists in DB; no logic increments it yet |
| Community module | Low | Placeholder; no design yet |
| Real job applications (external ATS) | Future | Currently tracking applications internally only |
| Job application cover letter input | Medium | Apply is one-click; could prompt for cover letter |
| CV → Jobs journey shortcut | Nice-to-have | "Find jobs matching this CV" CTA from CV Builder |
| Interview Coach | Nice-to-have | Mentioned in CV Builder UI but page not built |
| Admin panel | Low | `/admin` page exists but minimal functionality |
| Leaderboard data | Low | Only referral ranks; no reputation-based sorting yet |

---

## Full Routing Map

```
/                   → Landing / Waitlist (public)
/sign-in            → Clerk sign-in
/sign-up            → Clerk sign-up
/dashboard          → Main hub (auth required)
/profile            → Edit profile + skills (auth required)
/dena               → DENA AI full-page chat (auth required)
/skillswap          → SkillSwap AI marketplace (auth required)
/cv-builder         → AI CV + Cover Letter builder (auth required)
/jobs               → Jobs AI board + applications (auth required)
/leaderboard        → Referral leaderboard (public)
/admin              → Admin panel (auth required)
```

---

## API Endpoints

```
GET    /api/healthz
GET    /api/waitlist/count
POST   /api/waitlist
GET    /api/users/me                    — profile + skills
PATCH  /api/users/me                    — update profile
PUT    /api/users/me/skills             — replace skill set
POST   /api/dena/chat                   — DENA streaming chat
GET    /api/dena/conversations          — conversation history
GET    /api/dena/conversations/:id/messages
DELETE /api/dena/conversations/:id
GET    /api/skillswap/listings          — all skill listings
POST   /api/skillswap/listings          — create listing
GET    /api/skillswap/connections       — my connections
POST   /api/skillswap/connect           — request connection
PATCH  /api/skillswap/connections/:id   — accept/reject
POST   /api/cv-builder/generate         — generate resume + cover letter
GET    /api/jobs                        — list jobs with match scores
POST   /api/jobs/:id/apply              — apply for a job
GET    /api/jobs/my-applications        — my job applications
```
