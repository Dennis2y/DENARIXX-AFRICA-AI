# DENARIXX AFRICA AI — Development Status

> Last updated: 2026-06-12
> Stack: React + Vite · Express 5 · PostgreSQL + Drizzle ORM · pnpm monorepo · Clerk Auth · OpenAI

---

## ✅ COMPLETED

### Infrastructure
- [x] pnpm monorepo (api-server, denarixx frontend, mockup-sandbox)
- [x] PostgreSQL database + Drizzle ORM
- [x] Express API server with structured logging (pino)
- [x] OpenAPI 3.1 spec + Orval codegen (React Query hooks + Zod schemas)
- [x] Reverse proxy routing (/ → frontend, /api → api-server)

### Landing Page
- [x] Futuristic dark-mode hero with animated background
- [x] 10 AI module cards (DENA AI, SkillSwap, CV Builder, Interview Coach, Jobs AI, Community, Mentorship, Learning, Analytics, Marketplace)
- [x] Interactive modals per card (tagline, 5 features, status badge)
- [x] Animated waitlist counter (live from DB)

### Waitlist System
- [x] Signup form (email, name, role, country)
- [x] Referral code generation (8-char hex)
- [x] `?ref=CODE` tracking via URL param
- [x] Post-signup referral screen (copy link + share to X/LinkedIn)
- [x] Welcome email on signup (Resend — requires RESEND_API_KEY secret)

### Admin Dashboard (`/admin`)
- [x] Sortable signups table (all waitlist entries)
- [x] Role + country distribution bar charts
- [x] Top Referrers panel
- [x] CSV export

### Ambassador Leaderboard (`/leaderboard`)
- [x] Top 50 referrers with masked emails
- [x] Animated rank list
- [x] Rank lookup by referral code

---

## 🚧 IN PROGRESS

### Phase 1 — User System
- [ ] Clerk auth setup (email/password + Google OAuth)
- [ ] Protected routes + dashboard shell
- [ ] User profile page (bio, skills, experience, avatar)
- [ ] User settings page
- [ ] DB schema: users, profiles, user_skills

### Phase 2 — DENA AI
- [ ] OpenAI integration (Replit AI proxy)
- [ ] Floating DENA AI chat widget
- [ ] Streaming responses (SSE)
- [ ] Platform context + personalized responses
- [ ] Conversation history

---

## 📋 PLANNED

### Phase 3 — SkillSwap AI
- [ ] Skill categories + taxonomy
- [ ] Learning paths + roadmaps
- [ ] Mentor directory
- [ ] Learning dashboard + progress tracking
- [ ] AI-generated study plans (OpenAI)
- [ ] AI CV Builder (resume + cover letter generation)
- [ ] CV PDF export
- [ ] AI Interview Coach (mock interviews, scoring, feedback)

### Phase 4 — Jobs AI
- [ ] Job listings (browse, search, filter)
- [ ] AI job matching (based on user profile)
- [ ] Job applications system
- [ ] Saved jobs
- [ ] Employer dashboard (post/manage jobs)

### Phase 5 — Community
- [ ] Posts + comments + likes
- [ ] Follow/unfollow users
- [ ] Messaging system (DMs)
- [ ] Notification system
- [ ] Community feed

---

## 🚫 BLOCKED

| Item | Blocker |
|---|---|
| Welcome emails live | Needs `RESEND_API_KEY` secret added by user |
| Google OAuth on Clerk | Requires domain verification in prod (works in dev via test keys) |

---

## Architecture

```
artifacts/
  api-server/      → Express 5 API, /api prefix, Clerk middleware
  denarixx/        → React + Vite frontend, Clerk provider
lib/
  db/              → Drizzle ORM schema + migrations
  api-spec/        → OpenAPI 3.1 spec (source of truth)
  api-client-react/→ Generated React Query hooks
  api-zod/         → Generated Zod schemas
  integrations-openai-ai-server/ → OpenAI server SDK (after setup)
  integrations-openai-ai-react/  → OpenAI React hooks (after setup)
```

## DB Tables

| Table | Status | Description |
|---|---|---|
| waitlist | ✅ Live | Email signups + referral codes |
| users | 🚧 Planned | Clerk user bridge (clerk_user_id) |
| profiles | 🚧 Planned | Bio, skills, experience, avatar |
| user_skills | 🚧 Planned | Skill tags per user |
| conversations | 🚧 Planned | DENA AI chat sessions |
| messages | 🚧 Planned | DENA AI chat messages |
| job_listings | 📋 Phase 4 | Employer-posted jobs |
| job_applications | 📋 Phase 4 | User applications |
| posts | 📋 Phase 5 | Community posts |
| comments | 📋 Phase 5 | Post comments |
| follows | 📋 Phase 5 | User follow graph |
| direct_messages | 📋 Phase 5 | Messaging system |
