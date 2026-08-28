import { Temporal } from '@js-temporal/polyfill';
(globalThis as any).Temporal = Temporal;
import { beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';
import { execSync } from 'child_process';

let container: any;
let redisContainer: any;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();

  redisContainer = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = redisContainer.getMappedPort(6379).toString();
  
  // Tabloları oluştur
  execSync('npx prisma db init', { env: process.env, stdio: 'inherit' });
});

afterAll(async () => {
  if (container) await container.stop();
  if (redisContainer) await redisContainer.stop();
});
