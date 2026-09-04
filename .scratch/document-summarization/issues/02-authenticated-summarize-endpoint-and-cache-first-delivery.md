# 02: Yetkilendirilmiş Özetleme Uç Noktası ve Önbellek-Öncelikli (Cache-First) Teslimat

**What to build:** An authenticated API endpoint allows students to request a summary of any processed document in the shared vault, returning cached results instantly or generating and saving new ones on demand.

**Blocked by:** 01: Veritabanı Şema Genişletmesi ve Merkezi AI Özetleme Servisi

**Status:** ready-for-agent

- [ ] `POST /documents/:id/summarize` route is registered under document routes and protected by authentication middleware.
- [ ] If `document.summary` is already present in the database, the endpoint returns `200 OK` with `{ summary, cached: true }` without calling the AI service.
- [ ] If `document.summary` is not present, the endpoint calls `summarizeText`, persists the resulting summary into `document.summary`, and returns `200 OK` with `{ summary, cached: false }`.
- [ ] Route rejects requests with `401 Unauthorized` if no valid JWT token is provided.
- [ ] Route returns `404 Not Found` if the requested document ID does not exist.
- [ ] Integration tests verify both cache-hit and cache-miss scenarios with mocked AI calls.
