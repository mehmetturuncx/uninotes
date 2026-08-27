# 04: Full-Text Search (FTS & pg_trgm)

**What to build:** Kullanıcının geçmiş ders notları ve sınav soruları içinde arama yapabilmesi. Arama motorunun yazım hatalarını (typo) tolere ederek, eksik veya hatalı yazılan kelimelerde bile doğru sonuçları getirebilmesi (PostgreSQL pg_trgm eklentisi ile).

**Blocked by:** 03: Background Worker & OCR (BullMQ)

**Status:** ready-for-agent

- [ ] Veritabanında (PostgreSQL) `pg_trgm` eklentisinin aktif edilmesi
- [ ] Document tablosundaki text alanı için FTS (Full-Text Search) index'lerinin eklenmesi
- [ ] `GET /documents/search?q=kelime` endpoint'inin oluşturulması
- [ ] Yazım hataları içeren (typo tolerance) arama senaryolarının Supertest ile doğrulanması
