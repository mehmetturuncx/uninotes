import { Temporal } from '@js-temporal/polyfill';
(globalThis as any).Temporal = Temporal;
import { beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';

let container: any;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  
  // Tabloları oluştur
  execSync('npx prisma db init', { env: process.env, stdio: 'inherit' });
});

afterAll(async () => {
  if (container) await container.stop();
});
