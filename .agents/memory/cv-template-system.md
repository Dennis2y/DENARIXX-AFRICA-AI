---
name: CV Template System
description: How the 8 FlowCV-style templates work in CvBuilder.tsx — layout types, section parsing, and form data wiring.
---

## Layout system
Templates have a `layout: LayoutType` field:
- `"sidebar"` — dark/teal sidebar with contact panel; sidebar-dark and sidebar-teal IDs
- `"two-col-body"` — colored header + light sidebar body for skills/education; two-column ID
- `"single"` — modern, photo-right, classic, compact, minimal — each has custom HTML builder

## Section parser
`parseSections(md)` splits AI markdown by `## Heading` into a Record. `findSection()` does fuzzy key matching. Sections: summary/profile/objective, experience/work/employment, education, skill/technical/competenc, achievement/certif/award, language.

## buildPrintHTML signature
```ts
buildPrintHTML(content, name, role, template, photo?, formData?)
```
`formData` = `{ email, phone, location, linkedin, skills[] }` — passed from `form` state so sidebar templates can show real contact info in the sidebar (not just markdown output).

## Important: previewHtml deps
useMemo deps include `form.email, form.phone, form.location, form.linkedin, form.skills` — so preview re-renders when contact fields change.

**Why:** Without formData, sidebar templates had no contact/skills panel content since that info lives in form state, not in the AI-generated markdown.

## Template IDs (8 total)
sidebar-dark, sidebar-teal, modern, photo-right, classic, compact, minimal, two-column. Default: sidebar-dark.

## Grid
Template picker uses `grid-cols-4` (2 rows × 4 columns). Previously was `grid-cols-5`.
