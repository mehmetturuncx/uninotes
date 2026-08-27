# 01: Auth & Invite Code Altyapısı

**What to build:** Yeni bir kullanıcının admin tarafından veritabanında oluşturulmuş tek kullanımlık bir davet kodunu kullanarak sisteme kayıt olabilmesi ve sonrasında JWT ile giriş (login) yapabilmesi. Tüm yetki gerektiren API uçları (upload, search vb.) için JWT koruması sağlayan temel altyapının kurulması.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Veritabanında (Prisma) User ve InviteCode şemalarının oluşturulması
- [ ] Vitest ve test altyapısının (Testcontainers/in-memory DB vb.) kurulması
- [ ] `POST /auth/register` endpoint'inin (davet kodu doğrulayarak) yazılması
- [ ] `POST /auth/login` endpoint'inin JWT üretecek şekilde yazılması
- [ ] JWT doğrulama (auth middleware) katmanının oluşturulması
- [ ] Tüm auth ve register akışının Supertest ile test edilerek doğrulanması
