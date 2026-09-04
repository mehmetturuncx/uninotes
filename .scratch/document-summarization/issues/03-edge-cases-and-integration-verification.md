# 03: Uç Durumlar (Edge Cases) ve Entegrasyon Doğrulaması

**What to build:** The summarization system gracefully rejects invalid document states, protects existing data on external AI errors, and ensures full regression stability across the entire platform test suite.

**Blocked by:** 02: Yetkilendirilmiş Özetleme Uç Noktası ve Önbellek-Öncelikli (Cache-First) Teslimat

**Status:** ready-for-agent

- [x] Route rejects requests with `400 Bad Request` if the document is not in `COMPLETED` status (e.g. still `PENDING` or `PROCESSING`).
- [x] Route rejects requests with `400 Bad Request` if the document's `textContent` is empty or too short to produce a meaningful summary (fewer than 20 non-whitespace characters).
- [x] In the event of a Gemini API outage or quota failure during an uncached request, the route returns an appropriate `500` or `502` error without corrupting or deleting existing document data.
- [x] Markdown formatting in generated summaries (e.g. bullet points, bold key terms) is preserved verbatim.
- [x] All existing test suites pass cleanly with zero regressions.
