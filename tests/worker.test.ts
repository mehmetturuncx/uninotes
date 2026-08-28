import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
// @ts-ignore
import pdfParse from 'pdf-parse';

let db: any;
let redisConnection: IORedis;
let ocrQueue: Queue;
let worker: Worker;

// PDF Parse mock
export const getTextMock = vi.fn().mockResolvedValue({ text: 'Extracted PDF content' });
export const destroyMock = vi.fn().mockResolvedValue(undefined);

vi.mock('pdf-parse', () => ({
  PDFParse: class {
    getText = getTextMock;
    destroy = destroyMock;
  }
}));

// We mock S3 upload file stream download (worker will need to fetch the file to parse it)
// But to keep it simple, the worker can just pretend to download it, or we can mock global fetch
global.fetch = vi.fn().mockResolvedValue({
    arrayBuffer: vi.fn().mockResolvedValue(Buffer.from('mock pdf buffer'))
}) as any;


describe('Worker Seam: OCR Processor', () => {
  beforeAll(async () => {
    db = (await import('../src/prisma/db')).db;
    
    redisConnection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null
    });

    ocrQueue = new Queue('ocr-queue', { connection: redisConnection });
  });

  afterAll(async () => {
    if (worker) await worker.close();
    await ocrQueue.close();
    await redisConnection.quit();
  });

  beforeEach(async () => {
    await db.orm.public.Document.where({}).delete();
    await db.orm.public.User.where({}).delete();
    
    await ocrQueue.obliterate({ force: true });
    vi.clearAllMocks();
  });

  it('Başarılı senaryo: PDF parse edilip veritabanı güncellenmeli', async () => {
    const mockUser = await db.orm.public.User.create({
      email: 'worker1@uni.edu',
      password: 'hash'
    });

    const doc = await db.orm.public.Document.create({
      title: 'test.pdf',
      url: 'https://s3/test.pdf',
      hash: 'hash1',
      size: 100,
      mimeType: 'application/pdf',
      userId: mockUser.id,
      status: 'PENDING'
    });

    let startOcrWorker;
    try {
      startOcrWorker = (await import('../src/worker/ocr.worker')).startOcrWorker;
    } catch (err) {
      throw new Error("Kullanıcı henüz src/worker/ocr.worker.ts dosyasını ve startOcrWorker fonksiyonunu oluşturmadı!");
    }

    worker = startOcrWorker(redisConnection);
    
    await ocrQueue.add('ocr-job', {
      documentId: doc.id,
      url: doc.url
    });

    // Worker'ın işi bitirmesi için biraz bekle
    await new Promise(resolve => setTimeout(resolve, 1000));

    const updatedDoc = await db.orm.public.Document.where({ id: doc.id }).first();
    expect(updatedDoc.status).toBe('COMPLETED');
    expect(updatedDoc.textContent).toBe('Extracted PDF content');
    expect(getTextMock).toHaveBeenCalled();
  });

  it('Hata senaryosu: PDF okunamıyorsa 3 denemeden sonra FAILED statüsüne geçmeli', async () => {
    const mockUser = await db.orm.public.User.create({
      email: 'worker2@uni.edu',
      password: 'hash'
    });

    const doc = await db.orm.public.Document.create({
      title: 'error.pdf',
      url: 'https://s3/error.pdf',
      hash: 'hash2',
      size: 100,
      mimeType: 'application/pdf',
      userId: mockUser.id,
      status: 'PENDING'
    });

    getTextMock.mockRejectedValue(new Error('PDF Parse Error'));

    let startOcrWorker;
    try {
      startOcrWorker = (await import('../src/worker/ocr.worker')).startOcrWorker;
    } catch (err) {
      throw new Error("Kullanıcı henüz src/worker/ocr.worker.ts dosyasını ve startOcrWorker fonksiyonunu oluşturmadı!");
    }

    worker = startOcrWorker(redisConnection);
    
    await ocrQueue.add('ocr-job', {
      documentId: doc.id,
      url: doc.url
    }, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 100 }
    });

    // 3 retry x 100ms + işleme süresi için bekle
    await new Promise(resolve => setTimeout(resolve, 1500));

    const updatedDoc = await db.orm.public.Document.where({ id: doc.id }).first();
    expect(updatedDoc.status).toBe('FAILED');
    expect(updatedDoc.textContent).toBeNull();
    // İlk deneme + 3 retry = toplam 4 kez çağrılması beklenir?
    // Wait, BullMQ's "attempts" is the TOTAL number of attempts. So 3 total.
    expect(getTextMock).toHaveBeenCalledTimes(3);
  });
});
