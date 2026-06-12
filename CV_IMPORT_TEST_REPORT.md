# CV Import Test Report

**Generated:** 2026-06-12  
**Feature:** CV Upload & OCR Support

---

## Summary

The CV import pipeline supports three tiers of text extraction with automatic fallback and full diagnostics reporting.

---

## Extraction Tiers

| Tier | Library | Use Case | OCR? | Status |
|------|---------|----------|------|--------|
| 1 | `pdf-parse` | Standard text-based PDFs | No | ✅ Working |
| 2 | `pdfjs-dist` (legacy) | Complex text PDFs / alternate encodings | No | ✅ Working |
| 3 | JPEG extraction + `tesseract.js` | Scanned/image PDFs with embedded JPEGs | Yes | ✅ Working* |

> **Tier 3 note:** OCR via tesseract.js applies to scanned PDFs that embed JPEG pages in the binary. Works for scanner-generated PDFs. PDFs that contain non-JPEG image formats (PNG, TIFF) are not supported in this release. Language data is downloaded on first use (~25 MB, cached to `/tmp/tesseract-cache`).

---

## File Format Support

| Format | Parser | Status |
|--------|--------|--------|
| `.pdf` (text) | pdf-parse → pdfjs-dist | ✅ |
| `.pdf` (scanned, JPEG) | jpeg-extract + tesseract.js | ✅ |
| `.pdf` (scanned, non-JPEG) | — | ❌ Clear error message shown |
| `.docx` | mammoth | ✅ |
| `.txt` | UTF-8 read | ✅ |
| `.md` | UTF-8 read | ✅ |
| `.rtf` | UTF-8 read | ✅ |

---

## Diagnostics Returned

Every successful parse response now includes a `_diagnostics` object:

```json
{
  "fileType": "pdf",
  "pageCount": 2,
  "textExtracted": 1843,
  "ocrUsed": false,
  "method": "pdf-parse"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `fileType` | string | File extension (`pdf`, `docx`, `txt`, etc.) |
| `pageCount` | number | Number of pages (0 if not applicable or unknown) |
| `textExtracted` | number | Character count of text sent to OpenAI |
| `ocrUsed` | boolean | Whether OCR was used |
| `method` | string | Extraction method: `pdf-parse`, `pdfjs-text`, `ocr-jpeg`, `mammoth`, or `plain` |

---

## UI Diagnostics Panel

After a successful import, the green success banner shows inline diagnostic chips:

```
File type: PDF   Pages: 2   Text extracted: 1,843 chars   OCR: No   Method: pdf-parse
```

For OCR-processed files, the **OCR** chip is highlighted in amber.

---

## Error Messages

| Scenario | Error shown to user |
|----------|-------------------|
| Scanned PDF — OCR found no text | "This appears to be a scanned document. OCR processing was attempted but no readable text was found." |
| Scanned PDF — no embedded images | "Could not extract text from this PDF. It may be a scanned/image PDF. Try saving it as a text PDF or paste your CV content directly." |
| File too small / blank | "Not enough text found (need at least 50 characters)." |
| DOCX extraction failure | "Could not extract text from this DOCX file." |
| File > 25 MB | HTTP 413 — "File too large. Please use a file under 20 MB." |

---

## Environment Notes

- `canvas` npm native bindings: not compiled (NixOS build restriction) — not needed for text extraction
- System `tesseract` binary: not available — using `tesseract.js` WASM instead
- `pdfjs-dist` v6: main build requires `DOMMatrix` (DOM API, Node.js incompatible); **legacy ESM build** (`pdfjs-dist/legacy/build/pdf.mjs`) works in Node.js
- `tesseract.js` v7: WASM-based, loads via `require()` without native build scripts
- Body limit: 25 MB (configured in `app.ts`)

---

## What Does Not Work

- Scanned PDFs with embedded PNG/TIFF page images (only JPEG is extracted from binary)
- PDF rendering to images without `canvas` native bindings (used only for OCR, not text extraction)
- Vision-based OCR via OpenAI (project restricts model access to `gpt-3.5-turbo` only — no vision)
