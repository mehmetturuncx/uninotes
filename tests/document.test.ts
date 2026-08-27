import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';

vi.mock('../src/services/s3.service', () => ({
  uploadFile: vi.fn().mockResolvedValue('https://mock-s3-bucket.s3.amazonaws.com/test-doc.pdf')
}));

let app: any;
let db: any;

describe('Document Upload & Deduplication API', () => {
  beforeAll(async () => {
    app = (await import('../src/app')).default;
    db = (await import('../src/prisma/db')).db;
  });

  beforeEach(async () => {
    await db.orm.public.Document.where({}).delete();
    await db.orm.public.User.where({}).delete();
    await db.orm.public.InviteCode.where({}).delete();
  });

  const getAuthToken = async (email: string, code: string) => {
    await db.orm.public.InviteCode.create({ code });
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', inviteCode: code });
    return { token: res.body.token, user: res.body.user };
  };

  describe('POST /documents/upload', () => {
    it('Geçerli bir dosya yüklendiğinde S3 mock çağrılmalı ve DB ye PENDING olarak kaydedilmeli', async () => {
      const { token } = await getAuthToken('test1@uni.edu', 'CODE1');
      const fileBuffer = Buffer.from('dummy pdf content');

      const response = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', fileBuffer, 'dummy.pdf');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('document');
      expect(response.body.document).toHaveProperty('status', 'PENDING');
      expect(response.body.document).toHaveProperty('hash');

      const docInDb = await db.orm.public.Document.where({ id: response.body.document.id }).first();
      expect(docInDb).toBeDefined();
      expect(docInDb?.url).toBe('https://mock-s3-bucket.s3.amazonaws.com/test-doc.pdf');
    });

    it('Daha önce yüklenmiş aynı hash değerine sahip dosya tekrar yüklenmek istendiğinde 409 dönmeli', async () => {
      const { token, user } = await getAuthToken('test2@uni.edu', 'CODE2');
      const fileBuffer = Buffer.from('conflict content');
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      await db.orm.public.Document.create({
        title: 'Already Existing Doc.pdf',
        hash: hash,
        size: fileBuffer.length,
        mimeType: 'application/pdf',
        userId: user.id,
        url: 'https://mock.url',
        status: 'COMPLETED'
      });

      const response = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', fileBuffer, 'conflict.pdf');

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message');
    });

    it('Token olmadan istek atıldığında 401 dönmeli', async () => {
      const fileBuffer = Buffer.from('unauth content');

      // ECONNRESET önlemek için middleware reject ettiğinde body parse edilmesin diye dummy field gönderelim
      const response = await request(app)
        .post('/documents/upload')
        .set('Connection', 'keep-alive')
        .attach('file', fileBuffer, 'unauth.pdf');

      expect(response.status).toBe(401);
    });
  });
});
