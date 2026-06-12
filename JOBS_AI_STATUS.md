# Jobs AI — Feature Status

## Completed (Task #1 MVP)

### CV Builder
- [x] 6-step wizard (Personal → Experience → Education → Skills/Languages → Summary → Preview)
- [x] PDF/DOCX import with AI review modal
- [x] Live resume preview panel
- [x] Data cleanup pipeline (`cleanText` handles unknown/arrays safely)
- [x] Spoken languages field extracted from PDF + editable in Step 4
- [x] Generated CV text saved to `localStorage["denarixx_last_cv"]` for Tailor CV integration

### Jobs AI Page
- [x] **Improved match scoring** — weighted: Skills (70pts) + Location (15pts) + Role (15pts)
- [x] `matchedSkills[]` and `missingSkills[]` arrays returned per job
- [x] **Skill colour coding on cards** — green = you have it, orange = missing
- [x] **"Why this matches" panel** — lazy collapsible with static skill breakdown + AI analysis button
- [x] **3 navigation tabs** — Browse Jobs | My Applications | Saved Jobs
- [x] **Application Modal** — cover letter editor + "Generate with AI" (calls `POST /api/jobs/:id/cover-letter`)
- [x] **Tailor CV Modal** — ATS score, present/missing keywords, suggestions, tailored summary (calls `POST /api/jobs/:id/tailor-cv`)
- [x] **Saved Jobs** — bookmark toggle on every card, persisted to DB (`saved_jobs` table), dedicated tab
- [x] **Status Pipeline** — clickable 5-step pipeline (Applied → Reviewing → Interview → Offered → Rejected) in My Applications
- [x] **Cover letter display** — collapsible in My Applications

### API Endpoints (all under `/api/jobs`)
| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/` | — | `{ jobs[], total }` — includes matchScore, matchedSkills, missingSkills, saved |
| GET | `/my-applications` | — | `{ applications[] }` — includes coverLetter |
| GET | `/saved` | — | `{ jobs[] }` |
| POST | `/:id/apply` | `{ coverLetter? }` | `{ application }` |
| POST | `/:id/save` | — | `{ saved: true }` |
| DELETE | `/:id/save` | — | `{ saved: false }` |
| POST | `/:id/match-explain` | — | `{ summary, matchedSkills, missingSkills, suggestions }` |
| POST | `/:id/cover-letter` | — | `{ coverLetter }` |
| POST | `/:id/tailor-cv` | `{ cvText?, targetRole? }` | `{ atsScore, missingKeywords, presentKeywords, suggestions, tailoredSummary, tailoredCv }` |
| PATCH | `/applications/:appId/status` | `{ status }` | `{ application }` |

### Match Scoring Algorithm
Skills (60pts) + Location (15pts) + Experience Level (15pts) + Role Title (10pts) = 100pts max
- **Level** inferred from user's role string: "senior"/"lead"/"principal" → senior, "junior"/"entry"/"intern" → junior, etc.
- **Level scoring**: exact match = 15pts, 1 level apart = 8pts, 2+ apart = 0pts
- **Location**: "remote" in job = 15pts, country match = 15pts, any location = 5pts

### Database
- [x] `saved_jobs` table — `(user_id, job_id)` unique constraint, cascades on delete
- [x] `job_applications` table — existing, updated to include `cover_letter` field

## AI Models Used
- All AI calls use `gpt-3.5-turbo` (project restricts GPT-4 family)

## Known Limitations
- Tailor CV requires user to first generate a CV in CV Builder (localStorage key `denarixx_last_cv`)
- Match explain AI call is on-demand (click to load) to avoid rate limits on page load
- Location matching is keyword-based (no geocoding)
