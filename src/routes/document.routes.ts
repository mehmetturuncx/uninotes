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

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
};

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

        const createdDoc = await db.orm.public.Document.create({
            title: req.file.originalname,
            url: uploadedFile,
            hash: hash,
            size: req.file.buffer.length,
            mimeType: req.file.mimetype,
            userId: user,
            status: "PENDING"
        });

        await ocr_queue.add('ocr-job',{documentId: createdDoc.id, url: createdDoc.url});

        return res.status(201).json({ document: createdDoc });
    }
    catch (error) {
        return res.status(500).json({message: "Something went wrong."});
    }
});

export default router;