import { authMiddleware } from "../middlewares/auth.middleware";
import { Router } from "express";
import multer from 'multer';
import crypto from 'crypto';
import { uploadFile, deleteFile } from "../services/s3.service";
import { db } from "../prisma/db";
import { Queue } from "bullmq";

 
const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
});

import IORedis from 'ioredis';

const connection = process.env.REDIS_URL 
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: null
      });

const ocr_queue = new Queue('ocr-queue', {connection, defaultJobOptions: {
    attempts: 3,
    backoff: {type: 'fixed', delay: 1000}
}});

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    const user = req.user?.id;
    if (!user) {
        return res.status(401).json({ message: "User could bot be verified!" });
    }

    if (!req.file) {
        return res.status(400).json({ message: "File not found!" });
    }

    try {
        const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

        const hashExist = await db.orm.public.Document.where({ hash }).first();
        if (hashExist) {
            return res.status(409).json({ message: "This file already exists!" });
        }
        const uploadedFile = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

        const isPdf = req.file.mimetype === 'application/pdf';

        const createdDoc = await db.orm.public.Document.create({
            title: req.file.originalname,
            url: uploadedFile,
            hash: hash,
            size: req.file.buffer.length,
            mimeType: req.file.mimetype,
            userId: user,
            status: isPdf ? "PENDING": "COMPLETED"
        });

        if (isPdf) {
            await ocr_queue.add('ocr-job', {
                documentId: createdDoc.id,
                url: createdDoc.url
            }, {attempts: 3, backoff: {
                type: 'fixed', delay: 1000
            }});
        }

        return res.status(201).json({ document: createdDoc });
    }
    catch (error) {
        return res.status(500).json({message: "Something went wrong."});
    }
});

import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/search', authMiddleware, async (req,res)=>{
    const user = req.user?.id;
    if(!user) {
        return res.status(401).json({message: "Unauthorized"});
    }
    const q = req.query.q as string;
    if(!q) {
        return res.status(400).json({message: "Search term is required!"});
    }

    try {
        const client = await pool.connect();
        try {
            await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
            await client.query('CREATE EXTENSION IF NOT EXISTS unaccent;');
            await client.query("SET client_encoding TO 'UTF8';");
            
            const queryText = `
                SELECT id, title, url, "mimeType", "status"
                FROM "document"
                WHERE (
                    -- 1. Exact or Substring with Turkish normalization (unaccent + lower)
                    unaccent(LOWER(title)) ILIKE '%' || unaccent(LOWER($1)) || '%' OR
                    unaccent(LOWER(COALESCE("textContent", ''))) ILIKE '%' || unaccent(LOWER($1)) || '%' OR
                    -- 2. Word similarity with original text (fuzzy matching on words)
                    WORD_SIMILARITY($1, title) > 0.3 OR
                    WORD_SIMILARITY($1, COALESCE("textContent", '')) > 0.3 OR
                    -- 3. Word similarity with unaccented text (for typos on Turkish chars)
                    WORD_SIMILARITY(unaccent(LOWER($1)), unaccent(LOWER(title))) > 0.3 OR
                    WORD_SIMILARITY(unaccent(LOWER($1)), unaccent(LOWER(COALESCE("textContent", '')))) > 0.3
                )
                ORDER BY GREATEST(
                    WORD_SIMILARITY($1, title),
                    WORD_SIMILARITY($1, COALESCE("textContent", '')),
                    WORD_SIMILARITY(unaccent(LOWER($1)), unaccent(LOWER(title))),
                    WORD_SIMILARITY(unaccent(LOWER($1)), unaccent(LOWER(COALESCE("textContent", ''))))
                ) DESC, "createdAt" DESC
                LIMIT 20;
            `;
            
            const result = await client.query(queryText, [q]);
            return res.status(200).json({results: result.rows});
        } finally {
            client.release();
        }
    } 
    catch (error) {
        console.error("Search error: ", error);
        return res.status(500).json({ message: "Something went wrong while searching!"});
    }
});

// Kullanıcının kendi yüklediği dökümanları listeleme
router.get('/', authMiddleware, async (req, res) => {
    const user = req.user?.id;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const documents = await db.orm.public.Document.where({})
            .orderBy(doc => doc.createdAt.desc())
            .all();
        
        return res.status(200).json({ documents });
    } catch (error) {
        console.error("List documents error: ", error);
        return res.status(500).json({ message: "Something went wrong while fetching documents!" });
    }
});

// FAILED durumdaki PDF'leri yeniden OCR kuyruğuna gönder
router.post('/retry-failed', authMiddleware, async (req, res) => {
    try {
        const failedDocs = await db.orm.public.Document.where({ status: 'FAILED' }).all();
        
        let queued = 0;
        for (const doc of failedDocs) {
            if (doc.mimeType === 'application/pdf' && doc.url) {
                await db.orm.public.Document.where({ id: doc.id }).update({ status: 'PENDING' });
                await ocr_queue.add('ocr-job', {
                    documentId: doc.id,
                    url: doc.url
                }, { attempts: 3, backoff: { type: 'fixed', delay: 1000 } });
                queued++;
            }
        }

        return res.status(200).json({ message: `${queued} failed document(s) queued for retry.` });
    } catch (error) {
        console.error("Retry failed error: ", error);
        return res.status(500).json({ message: "Something went wrong!" });
    }
});

// Dosya silme (sadece yükleyen kullanıcı veya herhangi bir kullanıcı silebilir — MVP)
router.delete('/:id', authMiddleware, async (req, res) => {
    const user = req.user?.id;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const documentId = req.params.id as string;

    try {
        const document = await db.orm.public.Document.where({ id: documentId }).first();

        if (!document) {
            return res.status(404).json({ message: "Document not found!" });
        }

        // Cloudflare R2'den dosyayı sil
        if (document.url) {
            try {
                await deleteFile(document.url);
            } catch (e) {
                console.error("R2 delete error (continuing with DB delete): ", e);
            }
        }

        // Veritabanından kaydı sil
        await db.orm.public.Document.where({ id: documentId }).delete();

        return res.status(200).json({ message: "Document deleted successfully!" });
    } catch (error) {
        console.error("Delete document error: ", error);
        return res.status(500).json({ message: "Something went wrong while deleting the document!" });
    }
});

export default router;