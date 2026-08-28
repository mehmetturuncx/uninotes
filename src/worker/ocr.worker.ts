import { Worker, Job, RedisConnection } from "bullmq";
import { db } from "../prisma/db";
import { PDFParse } from 'pdf-parse';

export const startOcrWorker = (RedisConnection: any) => {
    const worker = new Worker('ocr-queue', async (job:Job)=>{
        const {documentId, url} = job.data;

        console.log(`Processing job ${job.id} for document ${documentId}`);

        await db.orm.public.Document
            .where({id: documentId})
            .update({status: "PROCESSING"});
        
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const parser = new PDFParse(buffer);
        const result = await parser.getText();
        await parser.destroy();

        await db.orm.public.Document
        .where({id: documentId})
        .update({status:"COMPLETED", textContent: result.text});
        
    }, {connection: RedisConnection});

    worker.on('failed', async (job,err)=>{
        if(job){
            if(job.attemptsMade >= (job.opts.attempts || 3)) {
                await db.orm.public.Document
                    .where({id: job.data.documentId})
                    .update({status:"FAILED"});
                
                console.log(JSON.stringify({
                    event: "JOB_FAILED",
                    traceId: job.data.documentId,
                    error: err.message
                }));
            }
        }
    });

    return worker;
};