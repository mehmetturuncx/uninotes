# 03: Background Worker & OCR (BullMQ)

**What to build:** Kullanıcı dosya yüklediğinde API'nin bloklanmaması için işin bir BullMQ kuyruğuna atılması. Ayrı bir process'te çalışan Worker'ın bu dosyayı işleyip (PDF-parse / OCR) metnini çıkartarak veritabanındaki Document kaydını güncellemesi. Ayrıştırmanın hata alması durumunda 3 kez tekrar denenip en sonunda `FAILED` statüsüne çekilerek arızalı dosyaların sistemi çökertmemesinin sağlanması.

**Blocked by:** 02: Dosya Yükleme (S3) ve Deduplication

**Status:** ready-for-agent

- [ ] Redis bağlantılarının ve BullMQ kuyruk konfigürasyonunun oluşturulması
- [ ] Worker process'inin (kuyruk dinleyicisi) ayrı bir entrypoint olarak ayağa kaldırılması
- [ ] PDF'ten metin çıkarma (pdf-parse vb.) entegrasyonunun yapılması
- [ ] Başarılı metin çıkarma işleminde Document kaydının text alanı ve statüsünün güncellenmesi
- [ ] Hata senaryolarının (max retries ve FAILED statüsünün) Worker bağımsız testleriyle doğrulanması
