import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';

let app: any;
let db: any;

describe('Auth & Invite Code API', () => {
  beforeAll(async () => {
    // Import app and db after setup.ts has initialized process.env.DATABASE_URL
    app = (await import('../src/app')).default;
    db = (await import('../src/prisma/db')).db;
  });

  beforeEach(async () => {
    // Veritabanını temizle
    await db.orm.public.User.where({}).delete();
    await db.orm.public.InviteCode.where({}).delete();
  });

  describe('POST /auth/register', () => {
    it('geçerli bir davet koduyla kayıt olabilmeli', async () => {
      // Setup
      const invite = await db.orm.public.InviteCode.create({
        code: 'TEST-INVITE-123'
      });

      // Test
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'student@uni.edu',
          password: 'password123',
          inviteCode: 'TEST-INVITE-123'
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'student@uni.edu');

      // Veritabanı doğrulama
      const updatedInvite = await db.orm.public.InviteCode.where({ id: invite.id }).first();
      expect(updatedInvite?.isUsed).toBe(true);
      expect(updatedInvite?.usedById).toBe(response.body.user.id);
    });

    it('kullanılmış bir davet koduyla kayıt olamamalı', async () => {
      // Setup
      const user = await db.orm.public.User.create({
        email: 'first@uni.edu',
        password: 'hashedpassword'
      });
      const invite = await db.orm.public.InviteCode.create({
        code: 'USED-INVITE',
        isUsed: true,
        usedById: user.id
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'second@uni.edu',
          password: 'password123',
          inviteCode: 'USED-INVITE'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /auth/login', () => {
    it('doğru bilgilerle login olabilmeli ve JWT dönmeli', async () => {
      const invite = await db.orm.public.InviteCode.create({
        code: 'LOGIN-INVITE'
      });

      await request(app)
        .post('/auth/register')
        .send({
          email: 'login-test@uni.edu',
          password: 'mysecretpassword',
          inviteCode: 'LOGIN-INVITE'
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'login-test@uni.edu',
          password: 'mysecretpassword'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
    });
  });
});
