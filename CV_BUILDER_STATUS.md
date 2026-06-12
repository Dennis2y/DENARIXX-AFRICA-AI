# CV Builder Status

_Last updated: June 2026_

---

## ✅ Working

### Core Flow
- **Auth gate** — `/cv-builder` requires sign-in; unauthenticated users are redirected to `/sign-in`
- **Profile auto-fill** — On load, pulls `name`, `email`, `location` (falls back to `country`), `linkedin`, `current role`, `bio`, and `skills` from the saved user profile via `GET /api/users/me`
- **2-step flow** — Build → Preview with animated transitions; "← Edit" returns to the form without losing data

### Form Fields (all empty by default, no demo data)
- Full Name, Email, Phone, Location, LinkedIn URL, Current Role
- Target Role, Target Company (used in cover letter salutation)
- Professional Summary, Work Experience, Education, Key Achievements
- Skills (tag input with add/remove, keyboard-enter support)
- Writing Tone selector (Professional / Creative / Executive)

### AI Assist Buttons
- **Generate Summary** — Creates a 2–3 sentence professional summary from experience
- **Rewrite** — Rewrites experience text professionally
- **ATS Optimize** — Rewrites experience for ATS keyword density
- **Improve Achievements** — Quantifies and strengthens achievement bullets
- **Suggest Skills** — Adds 8–12 role-relevant skills; merges without duplicates

### Upload & Parse
- Upload `.txt` / `.md` CV file
- AI extracts all fields (name, email, phone, experience, education, skills, etc.) and populates the form
- Graceful error if file is too short or parse fails

### Job Targeting & ATS Score
- Paste any job description → AI returns:
  - ATS score (0–100) with animated circular gauge
  - Matching keywords (green badges)
  - Missing keywords (red badges)
  - 3–5 improvement suggestions
  - Tailored summary with "Apply to my summary →" one-click action

### CV Generation
- `POST /api/cv-builder/generate` — GPT-3.5 generates formatted markdown resume + cover letter
- Sends: name, targetRole, currentRole, experience, skills, education, achievements, tone, summary, email, phone, location, LinkedIn, targetCompany
- Falls back to DB skills if none are provided in the form

### Preview (Step 2)
- **5 templates**: Professional (cyan), Executive (navy), Tech (blue), Graduate (serif classic), Creative (purple gradient)
- Live animated template picker with visual thumbnails
- **Resume tab** — formatted markdown rendered in white panel
- **Cover Letter tab** — fully editable textarea (edit before downloading); live preview updates as you type
- **Iframe print preview** — both tabs update when template or content changes

### PDF Download
- Uses `Blob URL → window.open → window.print()` for reliable cross-browser PDF output
- Popup blocker detection — shows clear message if blocked
- "Save as PDF" instruction shown below preview

### Copy to Clipboard
- Copy resume or edited cover letter text with one click
- Checkmark feedback for 2 seconds

### Error Handling
- **Missing `OPENAI_API_KEY`** — Returns HTTP 503 with clear message: _"AI service is not configured. Please add your OPENAI_API_KEY in environment settings."_
- **Invalid API key (401)** — Shows: _"Invalid OpenAI API key."_
- **Rate limit (429)** — Shows: _"OpenAI rate limit reached. Please wait and try again."_
- **Network errors** — Toast with specific error message from server; no silent failures
- **Required field validation** — Name, Target Role, and Experience must be filled before generation
- **Empty content guard** — AI assist buttons validate content is present before calling API

---

## 🔧 Fixed in This Session

| Issue | Fix |
|-------|-----|
| Demo data "Hanna Adefalo" / "Andela" / "University of Lagos" showing | Removed `SAMPLE_CV` constant entirely; form defaults to empty |
| Placeholder texts using specific names ("Amara Nwosu") | Replaced with generic examples ("Your full name", "City, Country") |
| Phone placeholder "+234 801 234 5678" (region-specific) | Replaced with "+1 555 000 0000" |
| "Software Engineer at Andela" in Current Role placeholder | Replaced with "e.g. Software Engineer at Company" |
| Experience placeholder mentioning "Flutterwave" and "Andela" | Replaced with generic "Company A / Company B" |
| "University of Lagos" in Education placeholder | Replaced with "University Name" |
| Cover letter read-only in preview | Now a fully editable textarea |
| PDF download could be blocked with no feedback | Added `Blob URL` approach + popup-blocked toast |
| `getOpenAI()` called outside try-catch | Wrapped in `getOpenAISafe()` — returns null + 503 if key missing |
| OpenAI errors all returned same generic message | Now distinguishes 401 (bad key), 429 (rate limit), 5xx (unavailable) |
| Profile `country` field not used as location fallback | Auto-fill now uses `data.country` if `data.location` is empty |
| Cover letter iframe not updating when text edited | iframe key includes `editedCoverLetter.length`; textarea drives srcDoc |

---

## ❌ Missing / Not Yet Implemented

| Feature | Notes |
|---------|-------|
| **True PDF generation** (server-side) | Currently uses browser print dialog; no binary `.pdf` file download. Would require `puppeteer` or `wkhtmltopdf` on the server. |
| **Save CV to profile** | Generated CVs are not persisted in the database; refreshing loses them |
| **CV history / versions** | No storage of multiple CV versions per user |
| **Multi-page PDF handling** | Very long CVs may overflow a single print page without automatic splitting |
| **Custom template fonts** (Google Fonts) | Templates use system fonts only; Google Fonts require network access during print |
| **Real-time ATS score** | Score only updates when "Analyse" button is clicked; not live as you type |
| **LinkedIn import** | Would allow one-click import from LinkedIn profile URL |
| **Image / photo on CV** | No avatar/photo support in any template |
| **Section reordering** | Users cannot drag-and-drop CV sections |
| **Portfolio/website link** | Profile `website` field exists but is not auto-filled into the CV contact line |

---

## 🚀 Next Improvements (Priority Order)

1. **Save generated CVs to DB** — Add a `user_cvs` table; let users name, save, and reload multiple CV versions
2. **Add portfolio/website to auto-fill** — Pull `profile.website` and include in contact line
3. **Server-side PDF export** — Install `puppeteer` on the API server; `POST /api/cv-builder/export-pdf` returns a binary PDF blob for true download
4. **Real-time word count & ATS tips** — Live feedback panel that updates as the user types (debounced, lightweight heuristics without AI)
5. **LinkedIn import** — Accept a LinkedIn profile URL, scrape public data, and pre-fill the form
6. **More templates** — Add a "Minimal" (whitespace-heavy) and "Two-Column" (sidebar layout) template
7. **Section reordering** — Drag-and-drop `react-dnd` to let users put Education before Experience etc.
