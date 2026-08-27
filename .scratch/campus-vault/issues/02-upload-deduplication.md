# 02: Dosya Yükleme (S3) ve Deduplication

**What to build:** Oturum açmış bir kullanıcının 20MB'a kadar olan PDF veya görsel dosyalarını yükleyebilmesi. Sistemin bu dosyayı AWS S3 veya MinIO'ya yükleyerek linkini veritabanına alması. Eğer daha önce aynı dosya (SHA-256 hash'i aynı olan) yüklenmişse, DB seviyesindeki deduplication mekanizması sayesinde sistemin bu dosyayı tekrar yüklemeyi reddetmesi.

**Blocked by:** 01: Auth & Invite Code Altyapısı

**Status:** ready-for-agent

- [ ] Prisma'da Document modelinin (hash alanı dahil ve UNIQUE constraint ile) oluşturulması
- [ ] AWS S3 / MinIO yükleme modülünün (mock destekli) yazılması
- [ ] `POST /documents/upload` endpoint'inin auth middleware ile korunarak eklenmesi
- [ ] Yüklenen dosyanın DB'de `PENDING` statüsüyle tutulması
- [ ] Uçtan uca dosya yükleme ve deduplication senaryosunun Vitest + Supertest ile (S3 mocklanarak) doğrulanması
