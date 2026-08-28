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
  "user": {
    "id": "uuid-v4",
    "email": "student@campus.edu"
  },
  "token": "jwt_token_string"
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
  "user": {
    "id": "uuid-v4",
    "email": "student@campus.edu"
  },
  "token": "jwt_token_string"
}
```

---

## 2. Dökümanlar (Documents)

### 2.1. Döküman Yükle (Upload)
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
    "url": "https://s3.amazonaws.com/.../Matematik_Notlari.pdf",
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

### 2.2. Tam Metin Arama (Search)
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
      "url": "https://s3.amazonaws.com/.../Matematik_Notlari.pdf",
      "mimeType": "application/pdf",
      "status": "COMPLETED"
    }
  ]
}
```
