import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
let db: any;
let app: any;

// S3 Service Mock
vi.mock('../src/services/s3.service', () => ({
  uploadFile: vi.fn().mockResolvedValue('https://mock-s3-bucket.s3.amazonaws.com/test-doc.pdf')
}));

// BullMQ Queue Mock
vi.mock('bullmq', () => {
  return {
    Queue: class {
      add = vi.fn().mockResolvedValue({ id: 'job-id' });
      close = vi.fn().mockResolvedValue(undefined);
    }
  };
});

describe('Search API: GET /documents/search', () => {

  beforeAll(async () => {
    db = (await import('../src/prisma/db')).db;
    app = (await import('../src/app')).default;
  });

  beforeEach(async () => {
    // Disable constraints temporarily or use CASCADE to wipe
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('TRUNCATE TABLE "document", "user", "inviteCode" CASCADE;');
    await pool.end();
    vi.clearAllMocks();
  });

  const getAuthToken = async (email: string, code: string) => {
    await db.orm.public.InviteCode.create({ code });
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', inviteCode: code });
    return { token: res.body.token, user: res.body.user };
  };

  const seedDocuments = async (userId: string) => {
    await db.orm.public.Document.create({
      title: 'Matematik Vize Notlari.pdf',
      url: 'https://s3/matematik.pdf',
      hash: 'hash-mat',
      size: 1024,
      mimeType: 'application/pdf',
      userId,
      status: 'COMPLETED',
      textContent: 'Bu dökümanda ileri matematik, türev ve integral konuları yer almaktadır.'
    });

    await db.orm.public.Document.create({
      title: 'Tarih Final Ozeti.pdf',
      url: 'https://s3/tarih.pdf',
      hash: 'hash-tar',
      size: 2048,
      mimeType: 'application/pdf',
      userId,
      status: 'COMPLETED',
      textContent: 'Osmanlı devleti yükselme dönemi ve İstanbul un fethi anlatılmaktadır.'
    });

    await db.orm.public.Document.create({
      title: 'Fizik Lab Raporu.pdf',
      url: 'https://s3/fizik.pdf',
      hash: 'hash-fiz',
      size: 512,
      mimeType: 'application/pdf',
      userId,
      status: 'PENDING', // PENDING documents should generally be searchable by title, but content might be null
      textContent: null
    });
  };

  it('Token olmadan istek atıldığında 401 dönmeli', async () => {
    const response = await request(app).get('/documents/search?q=matematik');
    expect(response.status).toBe(401);
  });

  it('Sorgu (q) parametresi verilmediğinde 400 dönmeli', async () => {
    const { token } = await getAuthToken('test1@uni.edu', 'CODE1');
    const response = await request(app)
      .get('/documents/search')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(400);
  });

  it('Tam eşleşme ile doğru dökümanları getirmeli', async () => {
    const { token, user } = await getAuthToken('test2@uni.edu', 'CODE2');
    await seedDocuments(user.id);

    const response = await request(app)
      .get('/documents/search?q=integral')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].title).toBe('Matematik Vize Notlari.pdf');
  });

  it('Alakasız kelime arandığında boş dönmeli', async () => {
    const { token, user } = await getAuthToken('test3@uni.edu', 'CODE3');
    await seedDocuments(user.id);

    const response = await request(app)
      .get('/documents/search?q=biyoloji')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.results).toHaveLength(0);
  });

  it('Typo tolerance: Yanlış yazımda (matamatik) bile matematik dökümanını bulmalı', async () => {
    const { token, user } = await getAuthToken('test4@uni.edu', 'CODE4');
    await seedDocuments(user.id);

    // Kasıtlı yazım hatası
    const response = await request(app)
      .get('/documents/search?q=matamatik')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.results.length).toBeGreaterThanOrEqual(1);
    expect(response.body.results[0].title).toBe('Matematik Vize Notlari.pdf');
  });

  it('Typo tolerance: Başlıkta geçen kelimeyi (tarh) yanlış yazınca bulmalı', async () => {
    const { token, user } = await getAuthToken('test5@uni.edu', 'CODE5');
    await seedDocuments(user.id);

    // Başlık "Tarih" kelimesini içeriyor, q = "tarh"
    const response = await request(app)
      .get('/documents/search?q=tarh')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.results.length).toBeGreaterThanOrEqual(1);
    expect(response.body.results[0].title).toBe('Tarih Final Ozeti.pdf');
  });

  it('Görselden (image/jpeg) çıkarılan OCR metni fuzzy search ile aranabilmeli', async () => {
    const { token, user } = await getAuthToken('test6@uni.edu', 'CODE6');
    
    // Görsel ders notu simülasyonu
    await db.orm.public.Document.create({
      title: 'Ders Notu Fotografi.jpg',
      url: 'https://s3/ders_notu.jpg',
      hash: 'hash-img-1',
      size: 4096,
      mimeType: 'image/jpeg',
      userId: user.id,
      status: 'COMPLETED',
      textContent: 'Veri yapıları dersinde ikili arama ağaçları (binary search tree) konusu işlendi.'
    });

    // Yazım hatası içeren arama: "ikili arama agaclari" -> "agac"
    const response = await request(app)
      .get('/documents/search?q=ikili arama agaclari')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.results.length).toBeGreaterThanOrEqual(1);
    expect(response.body.results[0].title).toBe('Ders Notu Fotografi.jpg');
  });
});
