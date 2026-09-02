# 02: Tesseract OCR Provider and Heuristic Quality Gate

**What to build:**
Extract text from clear image notes using an extensible Tesseract OCR provider (`tesseract.js` with `tur+eng`). Validate text clarity against a 3-point heuristic quality gate (confidence score, minimum length, noise/gibberish ratio). Images meeting quality standards are marked `COMPLETED` with their extracted `textContent` saved in the database.

**Blocked by:** 01: Image Upload and Queue Ingestion

**Status:** ready-for-agent

- [ ] An extensible `OcrProvider` interface and result type contract are defined.
- [ ] `TesseractOcrProvider` lazily initializes a singleton worker configured with `tur+eng`.
- [ ] A heuristic quality gate function checks confidence (`>= 60`), length (`>= 10`), and alphanumeric ratio (`>= 65%`).
- [ ] Clean image jobs that pass the quality gate update document status to `COMPLETED` and persist `textContent`.
- [ ] Unit tests verify provider execution and heuristic validation edge cases.
