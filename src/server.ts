import app from './app';
import { startOcrWorker } from './worker/ocr.worker';
import IORedis from 'ioredis';

const port = process.env.PORT || 3000;

const redisConnection = process.env.REDIS_URL 
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: null
      });

// Worker'ı başlat
const worker = startOcrWorker(redisConnection);
console.log('🤖 OCR Worker started...');

// Web sunucusunu başlat
const server = app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and worker');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await worker.close();
  redisConnection.quit();
});
