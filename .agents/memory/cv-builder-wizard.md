---
name: CV Builder wizard architecture
description: Key design decisions for the 6-step CV Builder wizard in artifacts/denarixx/src/pages/CvBuilder.tsx
---

## Rule
The CV Builder uses a `wizardStep` (1–6) integer, NOT a string `"build"/"preview"` Step type. Never add back a string step state.

**Why:** The original binary step model caused all form sections to be dumped on one page. The wizard splits them into focused steps with a live preview panel.

## How to apply
- Steps 1–5 render in `grid grid-cols-1 lg:grid-cols-[1fr_360px]` (form left, sticky preview right)
- Step 6 is full-width preview with template picker + tabs
- Generate button (`generate()`) calls `setWizardStep(6)` — never `setStep("preview")`
- Back/Next navigation: `setWizardStep(s => s ± 1)`

## Module-level utility functions (defined BEFORE CvBuilderContent)
These must stay outside the component — they are plain functions, not hooks:
- `cleanText(s)` — strips control chars, normalises bullets, collapses blank lines
- `cleanSkills(skills[])` — splits on `,;|/`, deduplicates case-insensitively, length filters
- `prioritizeExperience(exp)` — sorts tech roles first, logistics roles last
- `buildRawPreviewHTML(form, template)` — calls `buildPrintHTML` with raw form data for pre-generation preview

## Import Review flow
File upload → `parseFile()` → sets `importedData: ImportedCV` + `showImportReview: true` → user sees modal → clicks "Apply" → `applyImportedData()` merges into form state. Data is NEVER applied without user review.

## State removed (do not re-add)
- `step: Step` (replaced by `wizardStep: number`)
- `showUpload`, `showJobTarget` (replaced by `expandedSections` record)
- `parsedSuccess`, `parseDiagnostics` (replaced by import review modal)
