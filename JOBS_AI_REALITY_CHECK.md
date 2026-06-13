# JOBS AI — Reality Check

> What is real, what is internal-only, and what still needs external integration.

---

## ✅ Real & Working (DENARIXX-native)

| Feature | Status | Notes |
|---------|--------|-------|
| AI match scoring | ✅ Live | Skills (60pts) + Level (15pts) + Location (15pts) + Role title (10pts) = 100 |
| CV content in scoring | ✅ Live | Skills extracted from last-generated CV in localStorage, passed at query time |
| Target job title override | ✅ Live | `?targetTitle=` param overrides profile role for role-title matching |
| AI match explanation | ✅ Live | gpt-4o-mini, on-demand per card |
| CV Tailor / ATS analysis | ✅ Live | gpt-4o-mini; accepts CV text + targetRole; returns ATS score, keyword gaps, tailored summary |
| AI cover letter generation | ✅ Live | gpt-4o-mini; generated per job using user skills + job description |
| Application status pipeline | ✅ Live | 5 stages: Applied → Reviewing → Interview → Offered → Rejected |
| Application status emails | ✅ Live | Resend emails on status change (requires RESEND_API_KEY) |
| Saved jobs | ✅ Live | Persisted in `saved_jobs` DB table, bookmark toggle on cards |
| Skill colour coding | ✅ Live | Green = you have it, Orange = missing |
| DENARIXX-internal jobs | ✅ Live | 3 roles (Full-Stack Engineer, AI Prompt Engineer, Growth Lead) — fully tracked internally |

---

## 🔗 External Listings (visible but applies elsewhere)

These listings are from real African tech companies. Clicking **Apply Externally** opens the company's public careers page. DENARIXX does **not** receive or track these applications.

| Company | Career Page | Status |
|---------|------------|--------|
| Andela | https://www.andela.com/talent/ | ✅ URL valid |
| Flutterwave | https://flutterwave.com/us/careers | ✅ URL valid |
| Paystack | https://paystack.com/careers | ✅ URL valid |
| InstaDeep | https://www.instadeep.com/careers/ | ✅ URL valid |
| Jumia | https://group.jumia.com/careers | ✅ URL valid |
| Chipper Cash | https://chippercash.com/careers | ✅ URL valid |
| Safaricom | https://www.safaricom.co.ke/careers | ✅ URL valid |
| Wave Mobile Money | https://www.wave.com/en/careers/ | ✅ URL valid |
| Turing | https://www.turing.com/jobs/ | ✅ URL valid |
| Standard Bank | https://careers.standardbank.com/ | ✅ URL valid |
| Remoteli.io | https://remoteli.io/jobs | ✅ URL valid |
| M-Pesa Africa | https://www.safaricom.co.ke/careers | ✅ URL valid (via Safaricom) |

> **Honest note:** Seed job descriptions are representative — they are **not** confirmed live open roles. Salaries are market-rate ranges, not confirmed offers. The external URLs link to company career pages (not specific positions).

---

## ⚙️ Data Accuracy Caveats

- **Job listings are seeded**, not live-synced from external boards (LinkedIn, Greenhouse, Lever, etc.)
- **External apply URLs** point to career page homepages, not specific job postings
- **Match scores** are deterministic from your profile data — no ML model, purely weighted rules
- **ATS scores** are AI-estimated via gpt-4o-mini — indicative, not from a real ATS system

---

## 🚧 What Still Needs External Integration

| Feature | What's Needed | Priority |
|---------|--------------|----------|
| Live job feeds | Integration with LinkedIn Jobs API, Greenhouse, Lever, or Workable webhooks | High |
| Specific job posting URLs | Scrape/API per listing instead of career page homepage | Medium |
| Real employer accounts | Employer dashboard + job posting CMS | High |
| ATS handoff | OAuth integration with Greenhouse/Lever to push candidate applications | Medium |
| Interview scheduling | Calendly/Google Calendar integration | Low |
| Background verification | Integration with Smile ID or similar African identity verifiers | Medium |
| Salary data | Verified market data from local sources (e.g., Glassdoor Africa equivalent) | Low |
| Mobile app | Native iOS/Android app for on-the-go job search | Medium |

---

## 🔒 What Is Never Fake

- User accounts (Clerk auth — real sessions)
- Saved jobs (real DB persistence)
- DENARIXX-internal applications (real DB tracking, real emails)
- Match scores (real algorithmic computation against your real profile)
- AI outputs (real OpenAI API calls — charges incurred per call)
- Email notifications (real Resend API sends when RESEND_API_KEY is set)

---

*Last updated: June 2026 — DENARIXX Jobs AI MVP*
