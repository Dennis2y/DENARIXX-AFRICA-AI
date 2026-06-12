# CV Builder UX Report
**DENARIXX AFRICA AI — CV Builder Redesign**
Date: June 12, 2026

---

## Overview

The CV Builder page was redesigned from a single long-scroll form with a binary build/preview toggle into a **6-step wizard** with a persistent live preview panel. The redesign improves completion rates, reduces cognitive load, and introduces a reviewed import flow that prevents junk data from polluting the CV.

---

## What Changed

### Before
- Single scrollable page with all form sections stacked vertically
- Binary step model: `"build"` → `"preview"` (no intermediate steps)
- CV import applied data directly to fields with no review gate
- No live preview during form fill
- Generate button only at the bottom of a very long page

### After
- **6-step wizard**: Personal Info → Target Job → Experience → Skills & Education → AI Review → Preview
- **Sticky right-column live preview** on desktop (scales the iframe to 65%, updates as you type)
- **Sticky Generate button** in the right panel at all times during steps 1–5
- **Import Review Modal**: file upload triggers an overlay showing all extracted data before it's applied — user can expand/collapse sections and discard or apply
- **Collapsible sections**: Achievements (step 3) and ATS Matching (step 2) are collapsed by default to reduce clutter
- **Progress bar**: clickable step dots with completed-step checkmarks
- **Data cleanup pipeline**: `cleanText`, `cleanSkills`, `prioritizeExperience` functions sanitise all imported data
- **buildRawPreviewHTML**: live preview works even before AI generation, using raw form data

---

## Data Cleanup Rules

### `cleanText(s)`
- Strips control characters (C0, C1, Unicode replacement chars)
- Normalises bullet variants (`·`, `•`, `▪`, `◆`, `►`) to `- `
- Collapses 3+ blank lines to 2
- Trims trailing whitespace per line

### `cleanSkills(skills[])`
- Splits on `,`, `;`, `|`, `/`
- Deduplicates case-insensitively
- Rejects skills shorter than 2 chars or longer than 60 chars
- Strips residual control characters

### `prioritizeExperience(experience)`
- Splits experience into blocks (separated by blank lines)
- Sorts: **tech roles first** → general roles → logistics/warehouse last
- Tech roles matched by keywords: AI, ML, software, engineer, developer, backend, frontend, Python, React, etc.
- Logistics roles matched by: warehouse, driver, forklift, picker, packer, postal, courier, etc.
- Prevents logistics-heavy CVs from burying the AI-relevant experience

---

## Wizard Step Design

| Step | Title | Key Interactions |
|------|-------|-----------------|
| 1 | Personal Info | Import CV (drag/drop → review modal), photo upload, 6 contact fields |
| 2 | Target Job | Role + company, tone selector (3 options), language picker (12), optional ATS collapsible |
| 3 | Experience | Large textarea, AI Rewrite + ATS Optimize buttons, Achievements collapsible |
| 4 | Skills & Education | Skill tag input with Enter-to-add, AI suggest, education textarea |
| 5 | AI Review | Summary with AI generate, ATS panel (if run), prominent Generate CTA |
| 6 | Preview | Template picker (8 templates), Resume/Cover Letter tabs, editable cover letter, print-quality iframe preview, Download PDF |

---

## Import Review Modal

When a user uploads a CV (PDF, DOCX, TXT, MD), instead of immediately populating all fields:

1. AI parses the file (5–10s)
2. A **fullscreen overlay** appears showing:
   - Personal info card (name, email, phone, location, role + photo thumbnail if extracted)
   - Skills card with tag cloud (count shown in header)
   - Summary block
   - Experience collapsible (collapsed by default, shows first line as preview)
   - Education + Achievements side-by-side cards
3. User can **Discard** (no changes made) or **Apply to my CV** (populates all form fields)
4. Diagnostics (chars read, OCR used) shown in the modal header

---

## Live Preview Panel (Steps 1–5)

- Hidden on mobile, visible on `lg:` breakpoint (1024px+)
- Sticky at `top: 80px` (below nav + progress bar)
- **Template colour dots**: click to switch template without leaving the step
- iframe is scaled to 65% (`width: 154%, transform: scale(0.65)`) to fit the 360px column
- Updates on name, experience length, or skills count change (key includes these)
- Shows raw form data before generation (via `buildRawPreviewHTML`) and AI-enhanced data after generation
- **Sticky Generate button** below the preview panel — always reachable from any step

---

## Technical Notes

- `WIZARD_STEPS` array is `as const` — no runtime mutation possible
- `expandedSections` state: `Record<string, boolean>` — keyed by section ID (`"ach"`, `"jd"`, `"rev-exp"`)
- `buildRawPreviewHTML` composes a markdown-like string and pipes it through the existing `buildPrintHTML` function — no duplication of template CSS
- `previewHtml` useMemo now depends on `form` (the full object) rather than individual fields — simpler and more correct
- `ImportedCV` interface mirrors `CvFormData` fields plus `_diagnostics` from the parse API
- All utility functions (`cleanText`, `cleanSkills`, `prioritizeExperience`, `buildRawPreviewHTML`) are module-level — no closure over component state, fully testable

---

## Accessibility & Responsiveness

- All form inputs retain existing `inputCls` / `textareaCls` for consistent dark-mode styling
- Import review modal uses `fixed inset-0` with `z-50` and `backdrop-blur-sm` — keyboard-navigable (× button, Discard, Apply)
- Progress bar is horizontally scrollable on small screens (`overflow-x-auto`)
- Live preview panel is `hidden lg:block` — mobile users see only the form and navigation buttons
- Step navigation Back/Next buttons are always at the bottom of the form column

---

## Files Modified

- `artifacts/denarixx/src/pages/CvBuilder.tsx` — complete wizard redesign (~1,780 lines)

## Files Not Modified

- `artifacts/api-server/src/routes/cvbuilder.ts` — parse and generate endpoints unchanged
- `artifacts/api-server/src/routes/index.ts` — routing unchanged
