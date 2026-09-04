# 01: Veritabanı Şema Genişletmesi ve Merkezi AI Özetleme Servisi

**What to build:** The persistence layer supports caching document summaries, and the centralized AI module exposes an academic text summarization function powered by the configured Gemini model.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `Document` entity in the database schema includes an optional `summary` string field.
- [x] Database client contract and types are emitted and synchronized with PostgreSQL.
- [x] `summarizeText(textContent: string)` in the AI service invokes the Gemini model using a focused academic prompt that produces clear, structured markdown bullet points.
- [x] Unit tests verify that `summarizeText` correctly structures the prompt and returns the generated summary string.
