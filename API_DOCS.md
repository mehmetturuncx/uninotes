# UniNotes - API Referansı

Bu doküman UniNotes backend MVP'sinin uç noktalarını (endpoints) içerir. Tüm API istekleri `/` (kök) URL üzerinden gösterilmiştir (örnek: `http://localhost:3000`).

## Genel Kurallar
- İstek ve dönüş tipleri varsayılan olarak `application/json` formatındadır.
- Korumalı (Protected) rotalarda header kısmına `Authorization: Bearer <TOKEN>` eklenmesi zorunludur.

---

## 1. Yetkilendirme (Auth)

### 1.1. Kayıt Ol (Register)
Kullanıcının sisteme sadece davet kodu ile kaydolmasını sağlar.
- **Method:** `POST`
- **Endpoint:** `/auth/register`
- **Body:**
```json
{
  "email": "student@campus.edu",
  "password": "strongPassword123",
  "inviteCode": "ABC123XYZ"
}
```
- **Başarılı Dönüş (201 Created):**
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "uuid-v4",
    "email": "student@campus.edu"
  }
}
```

### 1.2. Giriş Yap (Login)
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Body:**
```json
{
  "email": "student@campus.edu",
  "password": "strongPassword123"
}
```
- **Başarılı Dönüş (200 OK):**
```json
{
  "message": "Login succesfull!",
  "token": "jwt_token_string",
  "user": {
    "id": "uuid-v4",
    "email": "student@campus.edu"
  }
}
```

---

## 2. Dökümanlar (Documents)

### 2.1. Belgeleri Listeleme
Sistemdeki tüm belgeleri (ortak arşiv) en yeniden en eskiye sıralı olarak döndürür.
- **Method:** `GET`
- **Endpoint:** `/documents`
- **Headers:**
  - `Authorization: Bearer <TOKEN>`
- **Başarılı Dönüş (200 OK):**
```json
{
  "documents": [
    {
      "id": "doc-uuid",
      "title": "Tarih Notları.pdf",
      "url": "https://pub-xxx.r2.dev/doc.pdf",
      "status": "COMPLETED",
      "createdAt": "2026-08-28T10:00:00.000Z"
    }
  ]
}
```

### 2.2. Belge Yükleme (PDF veya Resim)
Kullanıcının PDF veya Fotoğraf dosyası yüklemesini sağlar. PDF'ler `PENDING` statüsünde yüklenir ve OCR işlemine girer.
- **Method:** `POST`
- **Endpoint:** `/documents/upload`
- **Headers:**
  - `Authorization: Bearer <TOKEN>`
  - `Content-Type: multipart/form-data`
- **Body:**
  - `file`: (Dosya verisi - max 20MB)
- **Başarılı Dönüş (201 Created):**
```json
{
  "document": {
    "id": "uuid-v4",
    "title": "Matematik_Notlari.pdf",
    "url": "https://pub-xxx.r2.dev/Matematik_Notlari.pdf",
    "hash": "sha256_hash_value",
    "size": 1048576,
    "mimeType": "application/pdf",
    "userId": "uuid-v4",
    "status": "PENDING",
    "textContent": null
  }
}
```
*(Dosya zaten sistemde varsa `409 Conflict` döner)*

### 2.3. Tam Metin Arama (Search)
Yüklenen dökümanlar arasında yazım toleranslı (typo-tolerant) arama yapar (PostgreSQL pg_trgm destekli).
- **Method:** `GET`
- **Endpoint:** `/documents/search`
- **Query Parametreleri:**
  - `q`: Aranacak kelime (Örn: `?q=matematik`)
- **Headers:**
  - `Authorization: Bearer <TOKEN>`
- **Başarılı Dönüş (200 OK):**
```json
{
  "results": [
    {
      "id": "uuid-v4",
      "title": "Matematik_Notlari.pdf",
      "url": "https://pub-xxx.r2.dev/Matematik_Notlari.pdf",
      "mimeType": "application/pdf",
      "status": "COMPLETED"
    }
  ]
}
```

### 2.4. Belge Silme (Delete)
Bir belgeyi hem veritabanından hem de Cloudflare R2'den kalıcı olarak siler.
- **Method:** `DELETE`
- **Endpoint:** `/documents/:id`
- **Headers:**
  - `Authorization: Bearer <TOKEN>`
- **Başarılı Dönüş (200 OK):**
```json
{
  "message": "Document deleted successfully!"
}
```
*(Belge bulunamazsa `404 Not Found` döner)*
