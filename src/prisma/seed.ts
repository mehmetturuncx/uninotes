import { Temporal } from '@js-temporal/polyfill';
(globalThis as any).Temporal = Temporal;

import crypto from 'crypto';

async function main() {
    // db'yi Temporal yüklendikten sonra dinamik olarak içe aktarıyoruz
    const { db } = await import('./db');
    
    console.log("Seeding started...");

    const codesToCreate = 5;
    const generatedCodes = [];

    for (let i = 0; i < codesToCreate; i++) {
        // Rastgele 6 karakterli davet kodu üret
        const code = crypto.randomBytes(3).toString('hex').toUpperCase();
        await db.orm.public.InviteCode.create({ code });
        generatedCodes.push(code);
    }

    console.log("====================================");
    console.log("🎉 Seed Başarılı! Davet Kodları:");
    generatedCodes.forEach(code => console.log(`- ${code}`));
    console.log("====================================");
    
    // Uygulama kapanırken DB bağlantısını temizle
    await db.close();
}

main().catch((e) => {
    console.error("Seed sırasında hata oluştu:", e);
    process.exit(1);
});
