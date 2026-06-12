---
name: PDF OCR pipeline on Replit NixOS
description: How to extract text from PDFs (text + scanned) in the api-server bundle, given NixOS build restrictions
---

## The rule
Use a three-tier pipeline: pdf-parse v2 → pdfjs-dist legacy ESM → JPEG extraction + tesseract.js WASM.

**Why:** System `tesseract` binary not available on NixOS. `canvas` native bindings couldn't be compiled (build scripts blocked). `pdfjs-dist` v6 main build crashes in Node (`DOMMatrix` not defined). All three common workarounds required non-obvious fixes.

**How to apply:** Any new route that parses PDFs server-side should follow this pattern.

---

## Key findings

### pdf-parse@2.4.5
- NOT the classic function-based API (v1). v2 exports a class.
- Correct usage:
  ```js
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  const { text, pages } = await parser.getText();
  ```
- Constructor requires at least `verbosity` or `data` — `new PDFParse()` with no args throws.

### pdfjs-dist@6 in Node.js
- `build/pdf.mjs` (main): crashes — `DOMMatrix is not defined` (needs browser DOM)
- `legacy/build/pdf.mjs`: works in Node.js ✓ — use dynamic import
- Must set worker source before calling getDocument:
  ```js
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
  ```
- Text extraction (getTextContent) does NOT need canvas — only page rendering does.

### tesseract.js@7
- WASM-based, loads fine via `require("tesseract.js")` even though build scripts were ignored by pnpm.
- Language data downloaded to `cachePath` on first use (~25MB, cached).
- Node.js usage:
  ```js
  const { createWorker } = require("tesseract.js");
  const worker = await createWorker("eng", 1, { cachePath: "/tmp/tesseract-cache", logger: () => undefined });
  const { data } = await worker.recognize(jpegBuffer);
  await worker.terminate();
  ```

### Scanned PDF image extraction (no canvas)
- For scanner-generated PDFs: find JPEG SOI (0xFF 0xD8) / EOI (0xFF 0xD9) markers in the raw buffer.
- Works for most smartphone and flatbed scanner output which embeds JPEG pages.
- Does NOT work for PDFs with PNG/TIFF page images.

### build.mjs externals
Both `pdfjs-dist` and `tesseract.js` must be in the `external` array — esbuild should not bundle them.
