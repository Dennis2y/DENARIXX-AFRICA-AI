# DENARIXX AFRICA AI — Product Roadmap

> Africa's AI Operating System. Built for students, freelancers, professionals, and enterprises across the continent.

---

## Phase 0 — Growth Engine ✅ COMPLETE

The waitlist, referral system, leaderboard, admin dashboard, and email automation are locked and preserved.

| Feature | Status |
|---|---|
| Landing page + hero | ✅ |
| Waitlist signup + referral codes | ✅ |
| Referral leaderboard | ✅ |
| Admin dashboard | ✅ |
| Email welcome automation (Resend) | ✅ (needs RESEND_API_KEY) |
| Clerk authentication (sign-in / sign-up) | ✅ |
| User profile system | ✅ |
| DENA AI floating chat widget | ✅ |
| Branded dark-mode design system | ✅ |

---

## Phase 1 — Core Product 🚧 IN PROGRESS

### 1.1 SkillSwap AI 🚧
> A peer-to-peer skill exchange platform where Africans teach and learn from each other, powered by AI matching.

- Browse skill offerings and skill wants
- Post your own skills as offerings or learning goals
- AI-powered match suggestions (DENA matches you with ideal swap partners)
- Connection requests between users
- Session scheduling

**Status:** Building now

### 1.2 AI CV Builder ⬜
> Generate a professional, ATS-optimised CV from your Denarixx profile in seconds.

- Auto-populate from user profile + skills
- AI rewrites and enhances bullet points
- Multiple template styles (professional, creative, minimal)
- PDF export
- AI feedback and scoring

### 1.3 AI Interview Coach ⬜
> Practice for real interviews with an AI coach that knows African and global job markets.

- Job role-specific question banks
- STAR-format coaching
- Real-time feedback on answers
- Mock interview sessions with DENA
- Performance scoring and improvement tips

### 1.4 Jobs AI ⬜
> AI-powered job discovery, matching, and application assistant.

- Curated African + remote job listings
- AI match score between your profile and each job
- One-click AI cover letter generation
- Application tracker
- Recruiter radar (get noticed)

### 1.5 Community Feed ⬜
> A professional network and knowledge-sharing space for Africa's digital talent.

- Timeline posts (text, links, images)
- Skill-tagged posts and discovery
- Like, comment, share
- Follow system (people + topics)
- Featured success stories

### 1.6 Messaging System ⬜
> Private direct messaging between platform users.

- Real-time DMs (WebSocket or SSE)
- Conversation threads
- File/link sharing
- DENA AI suggestions inside chats

### 1.7 Business AI Tools ⬜
> AI-powered tools for African SMEs and entrepreneurs.

- Business plan generator
- Pitch deck AI
- Financial projections assistant
- Market analysis for African markets
- Invoice + proposal generator

---

## Phase 2 — Scale & Monetisation ⬜

- Denarixx Pro subscription (premium CV templates, unlimited AI coaching)
- Enterprise plans for companies posting jobs or training staff
- SkillSwap marketplace with ratings and reputation
- Verified credentials and badges
- Pan-African university and bootcamp partnerships

---

## Phase 3 — Ecosystem ⬜

- Mobile app (Expo / React Native)
- Denarixx API for third-party integrations
- AI agents for autonomous job applications
- Regional hubs (West Africa, East Africa, Southern Africa)
- Government and NGO partnerships

---

## Architecture Notes

- **Stack:** pnpm monorepo · React + Vite · Express 5 · PostgreSQL + Drizzle ORM · Clerk auth · OpenAI
- **Contract-first API:** all endpoints defined in `lib/api-spec/openapi.yaml`, codegen via Orval
- **AI:** OpenAI GPT-4o-mini (DENA chat) · expandable to specialised agents per module
- **Auth:** Clerk — all product routes require authentication; Phase 0 (waitlist/leaderboard) is public
