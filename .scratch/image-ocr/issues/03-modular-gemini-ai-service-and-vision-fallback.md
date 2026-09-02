# 03: Modular Gemini AI Service and Vision OCR Fallback

**What to build:**
A modular, centralized Gemini AI service that supports both vision extraction now and future document summarization. When an image fails the Tesseract quality gate (handwritten, blurry, or low contrast), the system automatically falls back to Gemini Flash Vision to extract high-accuracy text and mark the document `COMPLETED`.

**Blocked by:** 02: Tesseract OCR Provider and Heuristic Quality Gate

**Status:** ready-for-agent

- [ ] A centralized `ai` service (`gemini.client.ts` / `gemini.service.ts`) is established with configurable `GEMINI_MODEL` and API key.
- [ ] `GeminiVisionOcrProvider` integrates with the AI service to extract text from image buffers.
- [ ] A composite/fallback orchestrator automatically routes failed Tesseract results to Gemini Flash Vision.
- [ ] Handwritten or low-quality test images successfully extract text via Gemini Flash and update document status to `COMPLETED`.
