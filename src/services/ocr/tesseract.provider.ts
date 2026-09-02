import { createWorker, type Worker } from "tesseract.js";
import { type OcrProvider, type OcrResult } from "./ocr.types";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
    if (!workerPromise) {
        workerPromise = createWorker(['tur', 'eng']);
    }

    return workerPromise;
}

export class TesseractOcrProvider implements OcrProvider {
    async extractText(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
        const worker = await getWorker();
        const result = await worker.recognize(imageBuffer);

        return {
            text: result.data.text,
            confidence: result.data.confidence
        };
    }
}

export const terminateTesseract = async (): Promise<void> => {
    if(workerPromise) {
        const worker = await workerPromise;
        await worker.terminate();
        workerPromise = null;
    }
};