import { db } from './src/prisma/db'; const q = db.orm.public.Document.where({}); console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(q)));
