import { authMiddleware } from "../middlewares/auth.middleware";
import { Router } from "express";
import multer from 'multer';
import crypto from 'crypto';
import { uploadFile } from "../services/s3.service";
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
        await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
        await pool.query('SET pg_trgm.similarity_threshold = 0.1;');
        
        const queryText = `
            SELECT id, title, url, "mimeType", "status"
            FROM "document"
            WHERE "userId" = $1 
              AND (
                title % $2 OR 
                "textContent" % $2 OR
                title ILIKE '%' || $2 || '%' OR
                "textContent" ILIKE '%' || $2 || '%'
              )
            ORDER BY SIMILARITY(title, $2) + SIMILARITY("textContent", $2) DESC
            LIMIT 20;
        `;
        
        const result = await pool.query(queryText, [user, q]);
        
        return res.status(200).json({results: result.rows});
    } 
    catch (error) {
        console.error("Search error: ", error);
        return res.status(500).json({ message: "Something went wrong while searching!"});
    }
});

export default router;