import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { isOcrQualityAcceptable } from '../src/services/ocr/qualityGate';

describe('Edge Cases & Security Suite', () => {

  describe('1. Heuristic Quality Gate Sınır ve Uç Durumları', () => {
    it('Tam sınır değerlerinde (confidence: 60, uzunluk: 10) kabul etmeli', () => {
      // 10 karakter alfanümerik
      const result = {
        text: '1234567890',
        confidence: 60
      };
      expect(isOcrQualityAcceptable(result)).toBe(true);
    });

    it('Sınırın 1 puan altındaki değerleri (confidence: 59 veya uzunluk: 9) reddetmeli', () => {
      expect(isOcrQualityAcceptable({ text: '1234567890', confidence: 59 })).toBe(false);
      expect(isOcrQualityAcceptable({ text: '123456789', confidence: 60 })).toBe(false);
    });

    it('Aşırı boşluk ve tab içeren ama alfanümerik sayısı yetersiz metinleri reddetmeli', () => {
      const result = {
        text: '   \t\n   not   \n\t   ',
        confidence: 95
      };
      expect(isOcrQualityAcceptable(result)).toBe(false);
    });

    it('Tüm Türkçe özel karakterleri içeren geçerli metinleri kabul etmeli', () => {
      const result = {
        text: 'Ağaçlıklı gölgelerde şarkı söyleyen küçük çocuk ılık süt içti.',
        confidence: 88
      };
      expect(isOcrQualityAcceptable(result)).toBe(true);
    });

    it('Aşırı emoji ve matematiksel semboller içeren gürültülü taramaları (< %65) reddetmeli', () => {
      const result = {
        text: '∑∫√∂ 🎓📚📐 ≈≠≤≥ ±×÷ Matematik Notu',
        confidence: 70
      };
      expect(isOcrQualityAcceptable(result)).toBe(false);
    });

    it('null / undefined ve boş obje gibi beklenmeyen girdilerde çökmeden false dönmeli', () => {
      expect(isOcrQualityAcceptable({} as any)).toBe(false);
      expect(isOcrQualityAcceptable({ text: '', confidence: 100 })).toBe(false);
      expect(isOcrQualityAcceptable({ text: 'valid text length', confidence: undefined as any })).toBe(false);
    });
  });

  describe('2. Arama ve Veri Güvenliği Uç Durumları', () => {
    let app: any;
    let db: any;

    beforeAll(async () => {
      app = (await import('../src/app')).default;
      db = (await import('../src/prisma/db')).db;
    });

    beforeEach(async () => {
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      await pool.query('TRUNCATE TABLE "document", "user", "inviteCode" CASCADE;');
      await pool.end();
    });

    const getAuthToken = async (email: string, code: string) => {
      await db.orm.public.InviteCode.create({ code });
      const res = await request(app)
        .post('/auth/register')
        .send({ email, password: 'password123', inviteCode: code });
      return { token: res.body.token, user: res.body.user };
    };

    it('SQL Injection denemesinde (örn: single quote, comment) çökmemeli ve parametrik sorguyu korumalı', async () => {
      const { token } = await getAuthToken('sqli@uni.edu', 'CODE_SQLI');
      
      const maliciousQueries = [
        "' OR '1'='1",
        "'; DROP TABLE document; --",
        "matematik' UNION SELECT null, null, null, null, null --"
      ];

      for (const query of maliciousQueries) {
        const response = await request(app)
          .get(`/documents/search?q=${encodeURIComponent(query)}`)
          .set('Authorization', `Bearer ${token}`);

        // SQL injection başarılı olmamalı, sorgu güvenle çalışıp 200 dönmeli (boş sonuçla)
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('results');
      }
    });

    it('Türkçe büyük/küçük İ-i ve I-ı harf karmaşasında dökümanı bulabilmeli', async () => {
      const { token, user } = await getAuthToken('turkish_i@uni.edu', 'CODE_TURK');

      await db.orm.public.Document.create({
        title: 'Işık ve Optik Dersi.pdf',
        url: 'https://s3/isik.pdf',
        hash: 'hash-isik',
        size: 1024,
        mimeType: 'application/pdf',
        userId: user.id,
        status: 'COMPLETED',
        textContent: 'IŞIK VE AYDINLANMA PRENSİPLERİ, İSTANBUL ÜNİVERSİTESİ'
      });

      // Küçük 'ı' ile arama
      const res1 = await request(app)
        .get('/documents/search?q=ışık')
        .set('Authorization', `Bearer ${token}`);
      expect(res1.body.results.length).toBeGreaterThanOrEqual(1);

      // Küçük 'i' ile arama
      const res2 = await request(app)
        .get('/documents/search?q=istanbul')
        .set('Authorization', `Bearer ${token}`);
      expect(res2.body.results.length).toBeGreaterThanOrEqual(1);
    });
  });
});
