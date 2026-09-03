# 04: Fuzzy Search Verification and Edge-Case Hardening

**What to build:**
Verify end-to-end discoverability of OCR-extracted image notes in the shared vault via fuzzy search (`GET /documents/search?q=`), ensuring Turkish character normalization and typo tolerance work seamlessly. Handle edge cases including images with no text (mark `COMPLETED` with empty `textContent`) and infrastructure failures (BullMQ 3x retry then `FAILED`).

**Blocked by:** 03: Modular Gemini AI Service and Vision OCR Fallback

**Status:** ready-for-agent

- [x] Searching for words with typos or unaccented variations matches text extracted from images.
- [x] Images with no extractable text complete gracefully as `COMPLETED` (empty `textContent`) without failing.
- [x] Unrecoverable processing errors trigger BullMQ retry up to 3 times before setting status to `FAILED`.
- [x] End-to-end flow from upload to search result is verified with automated tests.
