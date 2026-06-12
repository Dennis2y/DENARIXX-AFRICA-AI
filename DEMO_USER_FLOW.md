# DENARIXX AFRICA AI — Demo User Flow Test
**Date:** June 12, 2026  
**Flow tested:** Sign Up → Profile → DENA AI → SkillSwap AI → CV Builder → Apply for Job

---

## Step 1: New User Signs Up

**Status: ✅ Working**

- Landing page shows "Sign Up Free" in navbar and "Get Started Free →" in hero
- `/sign-up` loads Clerk sign-up widget with DENARIXX branding
- Options: Google OAuth or email + password
- After sign-up, Clerk redirects to `/dashboard`
- `GET /api/users/me` auto-creates DB user record on first authenticated request (returns 201)

**No errors encountered.**

---

## Step 2: User Creates Profile

**Status: ✅ Working**

- Dashboard shows "Complete your profile" prompt when completion < 100%
- `/profile` page pre-fills name from Clerk
- Fields: Full Name, Role, Bio, Country, City, Experience Level, Career Goal, Portfolio Link
- Skills section: add/remove individual tags
- `PATCH /api/users/me` → 200 OK (confirmed in server logs)
- `PUT /api/users/me/skills` → 200 OK (confirmed in server logs)
- Completion percentage updates in real-time as fields are filled

**No errors encountered.**

---

## Step 3: User Opens DENA AI

**Status: ✅ Working** *(was ❌ Failing before June 12 fix)*

- `/dena` loads full-screen chat interface with sidebar
- User profile context automatically injected into AI system prompt
- GPT-4o responds to career questions, skill advice, CV guidance

**Error previously encountered (now fixed):**
```
403 Project does not have access to model `gpt-4o-mini`
```
**Fix applied:** All AI routes switched from `gpt-4o-mini` → `gpt-4o`

**Current status:** Fully working after fix.

- Conversation saved to DB (`conversations` table)
- Messages persisted (`messages` table)
- Sidebar shows conversation history
- New conversation button works
- Delete conversation works

---

## Step 4: User Uses SkillSwap AI

**Status: ✅ Working**

- `/skillswap` loads listings from `GET /api/skillswap/listings` → 200
- User can create a listing (teach/learn skill)
- `GET /api/skillswap/matches` → GPT-4o returns 3 AI-matched users with reasoning
- "Connect" button sends request via `POST /api/skillswap/connections` → 200
- Connections tab shows incoming/outgoing with accept/reject

**No errors encountered.**

⚠️ **Gap identified:** Once connected, there is no way for users to message each other. The connection is a dead end.

---

## Step 5: User Generates CV

**Status: ✅ Working** *(was ❌ Failing before June 12 fix)*

- `/cv-builder` pre-fills name and skills from user profile
- User fills target role + experience summary
- Selects tone (Professional / Creative / Executive)
- `POST /api/cv-builder/generate` → GPT-4o generates resume + cover letter

**Error previously encountered (now fixed):**
```
403 Project does not have access to model `gpt-4o-mini`
```
**Fix applied:** Route updated to `gpt-4o`

**Current status:** Fully working after fix.

- Template picker shows 6 layouts with visual previews
- "Preview with sample CV" opens full rendered CV in new tab
- "Download PDF" opens browser print dialog with selected template styling
- Cover letter also generated and downloadable

---

## Step 6: User Applies for a Job

**Status: ✅ Working**

- `/jobs` loads 12 seeded African tech jobs
- AI match score shown per job (% based on user's profile skills)
- Jobs sorted by match score
- "Apply" button opens modal with optional cover letter input
- `POST /api/jobs/:id/apply` → 200 OK, stored in DB
- "My Applications" tab shows applied jobs with date
- Dashboard applications count increments

**No errors encountered.**

⚠️ **Gap identified:** No way to save/bookmark a job without applying. No application status updates after applying.

---

## End-to-End Flow Summary

| Step | Status | Notes |
|------|--------|-------|
| Sign Up | ✅ Working | Clerk OAuth + email, auto user creation |
| Create Profile | ✅ Working | Saves to DB, completion % tracked |
| DENA AI Chat | ✅ Working | Fixed: gpt-4o-mini → gpt-4o |
| SkillSwap AI | ✅ Working | Listings, AI matches, connections |
| Generate CV | ✅ Working | Fixed: gpt-4o-mini → gpt-4o |
| Apply for Job | ✅ Working | Stored in DB, visible in dashboard |

**The full 6-step user journey is end-to-end functional as of June 12, 2026.**

---

## Blocking Issues for Extended Use

1. **No Messaging** — Users connect via SkillSwap but cannot communicate. P1.
2. **Admin Unprotected** — `/admin` accessible to any user. Security risk. P1.
3. **No Job Saving** — Users cannot bookmark jobs without applying. P2.
4. **No Public Profiles** — Community shows user cards but no profile page per member. P2.
