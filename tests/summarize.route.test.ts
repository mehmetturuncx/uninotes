import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';

// Mock summarizeText
export const summarizeTextMock = vi.fn();
vi.mock('../src/services/ai/gemini.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/ai/gemini.service')>();
  return {
    ...actual,
    summarizeText: summarizeTextMock
  };
});

let app: any;
let db: any;

describe('Document Summarization API: POST /documents/:id/summarize', () => {
  beforeAll(async () => {
    app = (await import('../src/app')).default;
    db = (await import('../src/prisma/db')).db;
  });

  beforeEach(async () => {
    await db.orm.public.Document.where({}).delete();
    await db.orm.public.User.where({}).delete();
    await db.orm.public.InviteCode.where({}).delete();
    vi.clearAllMocks();
  });

  const getAuthToken = async (email: string, code: string) => {
    await db.orm.public.InviteCode.create({ code });
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', inviteCode: code });
    return { token: res.body.token, user: res.body.user };
  };

  it('Token olmadan istek atıldığında 401 Unauthorized dönmeli', async () => {
    const response = await request(app).post('/documents/any-id/summarize');
    expect(response.status).toBe(401);
  });

  it('Var olmayan döküman ID si için 404 Not Found dönmeli', async () => {
    const { token } = await getAuthToken('sum1@uni.edu', 'SUM_CODE1');

    const response = await request(app)
      .post('/documents/non-existent-id/summarize')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it('Önbellekte özet yoksa (Cache Miss): summarizeText çağrılmalı, veritabanına kaydedilmeli ve cached: false dönmeli', async () => {
    const { token, user } = await getAuthToken('sum2@uni.edu', 'SUM_CODE2');

    const doc = await db.orm.public.Document.create({
      title: 'Ders Notu 1.pdf',
      hash: 'hash-sum-1',
      size: 500,
      mimeType: 'application/pdf',
      userId: user.id,
      status: 'COMPLETED',
      textContent: 'Biyoloji dersinde hücre bölünmesi mitoz ve mayoz olmak üzere ikiye ayrılır.'
    });

    summarizeTextMock.mockResolvedValueOnce('## Biyoloji Özeti\n- Mitoz: Vücut hücreleri\n- Mayoz: Üreme hücreleri');

    const response = await request(app)
      .post(`/documents/${doc.id}/summarize`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      summary: '## Biyoloji Özeti\n- Mitoz: Vücut hücreleri\n- Mayoz: Üreme hücreleri',
      cached: false
    });

    // summarizeText fonksiyonunun dökümanın metniyle çağrıldığını doğrula
    expect(summarizeTextMock).toHaveBeenCalledTimes(1);
    expect(summarizeTextMock).toHaveBeenCalledWith(doc.textContent);

    // Veritabanında dökümanın summary alanının güncellendiğini doğrula
    const updatedDoc = await db.orm.public.Document.where({ id: doc.id }).first();
    expect(updatedDoc?.summary).toBe('## Biyoloji Özeti\n- Mitoz: Vücut hücreleri\n- Mayoz: Üreme hücreleri');
  });

  it('Önbellekte özet zaten varsa (Cache Hit): summarizeText çağrılmadan doğrudan DB deki özet ve cached: true dönmeli', async () => {
    const { token, user } = await getAuthToken('sum3@uni.edu', 'SUM_CODE3');

    const existingSummary = '## Önceden Kaydedilmiş Kimya Özeti\n- Periyodik tablo';
    const doc = await db.orm.public.Document.create({
      title: 'Kimya Notu.pdf',
      hash: 'hash-sum-2',
      size: 600,
      mimeType: 'application/pdf',
      userId: user.id,
      status: 'COMPLETED',
      textContent: 'Kimyasal bağlar kovalent ve iyonik bağlar olarak incelenir.',
      summary: existingSummary
    });

    const response = await request(app)
      .post(`/documents/${doc.id}/summarize`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      summary: existingSummary,
      cached: true
    });

    // Cache hit durumunda AI kesinlikle çağrılmamalı (0 maliyet)
    expect(summarizeTextMock).not.toHaveBeenCalled();
  });

  describe('Uç Durumlar (Ticket 03 Edge Cases)', () => {
    it('Döküman durumu COMPLETED değilse (örn: PENDING veya PROCESSING) 400 Bad Request dönmeli', async () => {
      const { token, user } = await getAuthToken('sum_pending@uni.edu', 'SUM_CODE_PEND');

      const doc = await db.orm.public.Document.create({
        title: 'Bekleyen Not.pdf',
        hash: 'hash-sum-pending',
        size: 500,
        mimeType: 'application/pdf',
        userId: user.id,
        status: 'PROCESSING',
        textContent: 'Henüz OCR devam ediyor...'
      });

      const response = await request(app)
        .post(`/documents/${doc.id}/summarize`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(summarizeTextMock).not.toHaveBeenCalled();
    });

    it('Dökümanın textContent alanı boş veya 20 karakterden kısaysa 400 Bad Request dönmeli', async () => {
      const { token, user } = await getAuthToken('sum_short@uni.edu', 'SUM_CODE_SHORT');

      const doc = await db.orm.public.Document.create({
        title: 'Kisa Metin.pdf',
        hash: 'hash-sum-short',
        size: 500,
        mimeType: 'application/pdf',
        userId: user.id,
        status: 'COMPLETED',
        textContent: 'Kısa not' // < 20 karakter
      });

      const response = await request(app)
        .post(`/documents/${doc.id}/summarize`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(summarizeTextMock).not.toHaveBeenCalled();
    });

    it('summarizeText API kesintisinde hata fırlatırsa 500 dönmeli ve veritabanı dökümanı bozulmamalı', async () => {
      const { token, user } = await getAuthToken('sum_err@uni.edu', 'SUM_CODE_ERR');

      const doc = await db.orm.public.Document.create({
        title: 'Hata Notu.pdf',
        hash: 'hash-sum-err',
        size: 500,
        mimeType: 'application/pdf',
        userId: user.id,
        status: 'COMPLETED',
        textContent: 'Bu döküman özetlenirken yapay zeka servisinde beklenmedik bir kesinti oluşacak.'
      });

      summarizeTextMock.mockRejectedValueOnce(new Error('Gemini API 503 Service Unavailable'));

      const response = await request(app)
        .post(`/documents/${doc.id}/summarize`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);

      // Veritabanındaki döküman sağlam kalmalı (summary null olarak kalmalı, veri silinmemeli)
      const docInDb = await db.orm.public.Document.where({ id: doc.id }).first();
      expect(docInDb).toBeDefined();
      expect(docInDb?.summary).toBeNull();
    });
  });
});
