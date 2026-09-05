# 📚 UniNotes — Backend

Üniversite öğrencileri için **davetiyeli, yazım toleranslı arama destekli, hibrit OCR/Vision işlemeli ve yapay zeka özetlemeli** ortak ders notu arşivi.

Frontend bu API'ye bağlanır → öğrenciler PDF/fotoğraf yükler → sistem arka planda metni çıkarır → yapay zeka ile özetler → herkes tüm notlar arasında arama yapabilir.

---

## ✨ Özellikler

| Özellik | Nasıl Çalışıyor? |
| :--- | :--- |
| **Davet Kodlu Kayıt** | Sadece yöneticinin ürettiği tek kullanımlık hex kodlarıyla üye olunabilir. Brute-force koruması aktif (`express-rate-limit`). |
| **Hibrit Metin Çıkarma (OCR & Vision)** | PDF'ler ve görseller (JPG, PNG, WebP) BullMQ kuyruğuna atılır. Görseller önce `tesseract.js` ile taranır, kalite kapısını (`isOcrQualityAcceptable`) geçemezse Gemini Flash Vision modeline fallback yapar. PDF'ler ise önce dijital metin katmanı için ayrıştırılır; taranmış, el yazılı veya bozuk PDF'ler kalite kapısını (`isPdfAcceptable`) geçemezse doğrudan Gemini Vision multimodal analizine yönlendirilir. |
| **Yapay Zeka Destekli Özetleme** | Google Gemini entegrasyonu ile ders notları akademik asistan üslubuyla maddeler halinde özetlenir (`POST /documents/:id/summarize`). Üretilen özetler veritabanında önbelleğe alınır, tekrar eden isteklerde maliyetsiz ve anlık olarak döner. |
| **Yazım Toleranslı Arama** | PostgreSQL `pg_trgm` + `unaccent` eklentileriyle `WORD_SIMILARITY` tabanlı fuzzy search. `matematk` → `matematik`, `seker` → `şeker` gibi yazım hataları ve Türkçe karakter varyasyonları bulunur. |
| **Ortak Arşiv** | Tüm kullanıcılar tüm notları görebilir ve arayabilir. Silme yetkisi yalnızca dosya sahibinde. |
| **Dosya Deduplication** | SHA-256 hash kontrolü ile aynı dosyanın tekrar yüklenmesi engellenir (`409 Conflict`). |
| **Backend Proxy Stream** | Dosyalar Cloudflare R2'den backend üzerinden sunulur; `r2.dev` domain engellemelerinden etkilenmez. |

---

## 🏗️ Mimari

```
src/
├── app.ts                       # Express uygulaması, CORS, trust proxy
├── server.ts                    # HTTP sunucusu + OCR Worker başlatma
├── middlewares/
│   ├── auth.middleware.ts       # JWT doğrulama (Bearer token)
│   └── rateLimiter.ts           # Brute-force koruması (register: 5/15dk, login: 10/15dk)
├── routes/
│   ├── auth.routes.ts           # POST /auth/register, POST /auth/login
│   └── document.routes.ts       # GET/POST/DELETE /documents, GET /documents/search, POST /documents/:id/summarize
├── schemas/
│   └── auth.schema.ts           # Zod doğrulama şemaları
├── services/
│   ├── s3.service.ts            # Cloudflare R2 (S3 uyumlu) upload/delete/get
│   ├── ai/                      # Merkezi AI altyapısı (Vision OCR & Summarization)
│   │   ├── gemini.client.ts
│   │   └── gemini.service.ts
│   └── ocr/                     # OCR Motorları ve Heuristic Kalite Kapısı
│       ├── ocr.types.ts
│       ├── qualityGate.ts
│       ├── tesseract.provider.ts
│       └── gemini.provider.ts
├── prisma/
│   ├── contract.prisma          # Veritabanı şeması (User, Document, InviteCode)
│   ├── db.ts                    # Prisma v8 client + Temporal polyfill
│   └── seed.ts                  # Başlangıç davet kodları üretimi
└── worker/
    └── ocr.worker.ts            # BullMQ Worker — Hibrit PDF ve görsel metin çıkarma
```

---

## 🛠️ Tech Stack

| Katman | Teknoloji |
| :--- | :--- |
| **Runtime** | Node.js + TypeScript |
| **Framework** | Express.js v5 |
| **ORM** | Prisma v8 (Early Access) |
| **Veritabanı** | PostgreSQL (Supabase) + `pg_trgm` + `unaccent` |
| **Kuyruk** | Redis (Upstash) + BullMQ |
| **Yapay Zeka (AI)** | Google Gemini 2.5 Flash (`@google/genai`) |
| **Depolama** | Cloudflare R2 (S3 uyumlu) |
| **Auth** | JWT + bcryptjs |
| **Rate Limiting** | express-rate-limit (in-memory) |
| **Test** | Vitest |
| **Hosting** | Render (Free Tier) |

---

## 🚀 Kurulum

### 1. Klonla ve bağımlılıkları kur
```bash
git clone https://github.com/mehmetturuncx/uninotes-backend.git
cd uninotes-backend
npm install
```

### 2. Ortam değişkenlerini ayarla
```bash
cp .env.example .env
# .env dosyasını aç ve bilgileri doldur
```

### 3. Veritabanını hazırla
```bash
npm run contract:emit
npx prisma db init
```

### 4. Davet kodlarını üret
```bash
npm run seed
# Konsola 5 adet tek kullanımlık davet kodu düşecektir
```

### 5. Çalıştır
```bash
npm run start
# Sunucu http://localhost:3000 adresinde ayağa kalkar
```

---

## 📡 API Uç Noktaları

| Method | Endpoint | Açıklama | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | Davet kodu ile kayıt | ✗ |
| `POST` | `/auth/login` | E-posta / şifre ile giriş | ✗ |
| `GET` | `/documents` | Tüm notları listele | ✓ |
| `POST` | `/documents/upload` | PDF veya fotoğraf yükle (max 20MB) | ✓ |
| `GET` | `/documents/search?q=` | Yazım toleranslı arama | ✓ |
| `GET` | `/documents/:id/file` | Dosyayı tarayıcıda aç (proxy stream) | ✗ |
| `POST` | `/documents/:id/summarize` | Belge metnini yapay zeka ile özetle (cache destekli) | ✓ |
| `DELETE` | `/documents/:id` | Dosyayı kalıcı sil (sadece sahibi) | ✓ |

Detaylı istek/yanıt formatları için → [`API_DOCS.md`](API_DOCS.md)

---

## 🔒 Güvenlik

- **JWT (1 saat ömür):** Tüm korumalı uçlarda `Authorization: Bearer <token>` zorunlu.
- **Rate Limiting:** Kayıt → 15 dk'da max 5 başarısız deneme, Giriş → 15 dk'da max 10. Başarılı istekler sayılmaz.
- **Sahiplik Kontrolü:** `DELETE /documents/:id` yalnızca dosyayı yükleyen kullanıcı tarafından çağırılabilir (`403 Forbidden`).
- **Hash Deduplication:** Aynı dosyanın tekrar yüklenmesi SHA-256 ile engellenir.

---

## 👥 Ekip

| Rol | Kim |
| :--- | :--- |
| **Backend** | [@mehmetturuncx](https://github.com/mehmetturuncx) |
| **Frontend** | [@enesKAYA16](https://github.com/EnesKAYA16) |

---

*Mentorship & Pair-Programming ile Antigravity Agent (Google) tarafından TDD süreçleri izlenerek geliştirilmiştir.*
