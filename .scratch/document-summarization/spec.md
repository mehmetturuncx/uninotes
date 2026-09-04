# Spec: AI-Powered Document Summarization

## Problem Statement

University students frequently upload and browse multi-page lecture notes, slide decks, and exam prep sheets in the shared vault. During intensive exam periods, reading through 30 to 80 pages of dense technical text or lecture transcriptions just to grasp the core concepts or determine if a document is relevant consumes excessive time. Furthermore, sending repetitive AI requests for every single page view would quickly deplete free-tier API quotas and introduce unnecessary latency.

## Solution

An on-demand, persistent cache-first AI document summarization system. Any authenticated student can request a summary for any processed document in the shared vault. The system checks the database first; if a summary already exists, it is returned immediately with zero AI latency and zero API cost. If a summary does not exist yet, the system invokes the centralized Gemini Flash language model with the document's extracted text, stores the structured markdown summary in the database, and returns it to the user.

## User Stories

1. As a university student preparing for an upcoming exam, I want to request a summary of a lecture note, so that I can quickly review key definitions and theorems without reading 50 pages of raw text.
2. As a student browsing the shared vault, I want to see a concise overview of a document's contents, so that I can decide whether the note is worth downloading or studying.
3. As a student, I want the summary to be generated on demand via a single action, so that I don't have to manually copy and paste text into third-party AI tools.
4. As a student returning to a note that was previously summarized, I want the summary to appear instantly, so that I am not delayed by redundant AI generation.
5. As a student, I want any document in the shared vault to be summarizable regardless of who uploaded it, so that our study group benefits collaboratively.
6. As a student viewing a summary, I want the summary formatted with bullet points and bold key terms, so that it is readable and organized for revision.
7. As a frontend client, I want the API response to indicate whether the summary was served from cache or generated live, so that appropriate UI status indicators can be displayed.
8. As a student requesting a summary for a note whose OCR processing is still pending or processing, I want to receive an informative error, so that I know to wait for text extraction to finish.
9. As a student requesting a summary for a document with no extractable text, I want a clear message stating that the document has insufficient text to summarize.
10. As an unauthenticated visitor, I want summary requests to be rejected with a 401 Unauthorized status, so that platform resources remain protected.
11. As a system operator, I want all generated summaries to be cached permanently in the database, so that Gemini API quota consumption and billing costs are minimized.
12. As a system operator, I want external AI API downtime or rate-limit errors to fail gracefully without corrupting document metadata, so that system stability is preserved.

## Implementation Decisions

### 1. Database Schema Extension
Extend the `Document` entity with an optional persistent field to store the generated summary text:
- Field: `summary` (optional text/string) on the `Document` model.
- Migration: Update Prisma contract and synchronize with PostgreSQL.

### 2. Centralized AI Service Implementation
Flesh out the existing placeholder function in the AI service module:
- Function: `summarizeText(textContent: string): Promise<string>`
- Model: Uses the configured Gemini Flash model via the centralized client.
- Prompt Engineering: Employs a structured system instruction instructing the model to act as an academic tutor, outputting concise markdown bullet points, highlighting critical terms, and summarizing solely based on the provided text without hallucination.

### 3. API Contract & Seam
Expose an authenticated HTTP endpoint under the documents resource:
- **Endpoint:** `POST /documents/:id/summarize`
- **Security:** Requires valid JWT Bearer token via the authentication middleware.
- **Workflow (Cache-First):**
  1. Retrieve document by ID. If not found, return `404 Not Found`.
  2. If `document.summary` is already populated, immediately return `200 OK` with `{ summary: document.summary, cached: true }`.
  3. Validate pre-conditions: verify `document.status === 'COMPLETED'` and `document.textContent` contains meaningful content (minimum 20 non-whitespace characters). If invalid, return `400 Bad Request`.
  4. Invoke `summarizeText(document.textContent)`.
  5. Update document record in database: set `summary` field.
  6. Return `200 OK` with `{ summary, cached: false }`.

## Testing Decisions

### 1. What Makes a Good Test
Tests must focus strictly on observable HTTP behavior, contracts, and state transitions rather than internal function details:
- Correct status codes (`200`, `400`, `401`, `404`).
- Verification that live calls hit the AI service and persist the result to the database.
- Verification that subsequent requests return the cached summary without re-invoking the external AI model (zero network calls on cache hit).
- Mocking: External Google GenAI calls are mocked at the client/service seam during test execution to ensure fast, zero-quota, deterministic tests.

### 2. Modules Tested & Prior Art
- Test File: Dedicated test suite under `tests/summarize.test.ts`.
- Prior Art: Follows the existing patterns in `tests/document.test.ts` (supertest + authentication helpers + mock service boundaries).

## Out of Scope

- Background summarization at upload time (summaries are strictly on-demand to conserve resources).
- Multi-language translation of summaries.
- Interactive multi-turn chat/Q&A over the document.
- Text-to-speech / audio generation for summaries.

## Further Notes

- Leverages existing `@google/genai` infrastructure and `GEMINI_API_KEY` configuration.
- Status: `ready-for-agent`.
