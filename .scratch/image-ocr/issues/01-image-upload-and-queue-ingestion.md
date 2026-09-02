# 01: Image Upload and Queue Ingestion

**What to build:**
Enable students to upload image files (JPG, JPEG, PNG, WebP) alongside existing PDFs. Uploaded images are validated, stored in Cloudflare R2, persisted in the database with `PENDING` status, and queued to BullMQ `ocr-queue` with file metadata for asynchronous processing.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Multer and upload endpoint accept `image/jpeg`, `image/png`, and `image/webp` (along with `application/pdf`) up to 20MB.
- [x] Unsupported MIME types return `400 Bad Request`.
- [x] SHA-256 deduplication works for images (`409 Conflict` on duplicate upload).
- [x] Image documents are saved in DB with status `PENDING`.
- [x] BullMQ `ocr-queue` receives an `ocr-job` containing `documentId`, `url`, and `mimeType`.
