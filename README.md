# Campus Vault - Backend

Campus Vault, üniversite öğrencilerinin ders notlarını (PDF ve Fotoğraf) yükleyip, daha sonra kendi notları arasında kelime ve yazım hatası toleranslı olarak arama yapabildiği bir eğitim-asistan uygulamasıdır. 

Bu depo (repository) uygulamanın API'lerini, veritabanı yönetimini ve arka plan işlemlerini (OCR) yöneten backend kısmını içerir.

## Özellikler

- **Kapalı Sistem:** Sisteme sadece yönetici tarafından dağıtılan **Davet Kodları (Invite Code)** ile üye olunabilir.
- **Güvenli Depolama (S3):** Dökümanlar AWS S3 (veya MinIO) uyumlu depolama servislerinde tutulur. Aynı dosyanın (aynı Hash'e sahip) iki kez yüklenmesi veritabanı seviyesinde (Deduplication) engellenmiştir.
- **Arka Plan OCR (BullMQ):** PDF dosyaları yüklenir yüklenmez Redis destekli BullMQ kuyruğuna aktarılır ve arka planda çalışan Worker tarafından metne dönüştürülür. İşlem başarılı olmazsa tekrar deneme (Retry) mekanizmaları devreye girer.
- **Typo-Tolerant Arama (pg_trgm):** Kullanıcı "Matematik" aramak yerine yanlışlıkla "Matamatik" bile yazsa, sistem benzerlik analizine (Fuzzy Text Search) göre en doğru sonuçları bulur.

## Kullanılan Teknolojiler (Tech Stack)

- **Node.js & TypeScript**
- **Express.js**
- **PostgreSQL** (Prisma ORM v8 Early Access)
- **Redis & BullMQ** (Kuyruk / Arka plan işlemleri)
- **Vitest** (Entegrasyon / TDD)

## Kurulum ve Çalıştırma

### 1. Gereksinimler
- Node.js (v18+ veya üstü)
- PostgreSQL (veya Docker)
- Redis (veya Docker)
- AWS S3 Hesabı (veya MinIO gibi yerel bir alternatif)

### 2. Ortam Değişkenleri (Environment Variables)
Projeyi klonladıktan sonra dizinde bulunan `.env.example` dosyasının bir kopyasını alıp adını `.env` olarak değiştirin ve içindeki bilgileri doldurun:
```bash
cp .env.example .env
```

### 3. Veritabanını Hazırlama
Prisma v8 (Contract Emit) kullanılarak veritabanı tablolarını oluşturun:
```bash
npm run contract:emit
npx prisma db init
```

### 4. Başlangıç Verilerini Üretme (Seed)
İlk davet kodlarını (Invite Code) veritabanına eklemek için seed komutunu çalıştırın. Konsola kayıt olmak için kullanabileceğiniz 5 adet davet kodu düşecektir.
```bash
npm run seed
```

### 5. Çalıştırma
Projeyi development (geliştirme) modunda ayağa kaldırmak için:
```bash
npm run dev
```

## API Referansı
Frontend entegrasyonu için uç nokta ve JSON yapılarının tam listesi `API_DOCS.md` dosyasında yer almaktadır.

---
*Mentorship & Pair-Programming ile Antigravity Agent (Google) tarafından TDD süreçleri izlenerek geliştirilmiştir.*
