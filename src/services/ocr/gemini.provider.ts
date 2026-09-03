import { type OcrProvider, type OcrResult } from "./ocr.types";
import { extractTextFromImage } from "../ai/gemini.service";

export class GeminiVisionOcrProvider implements OcrProvider {
    async extractText(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
        const extractedText= await extractTextFromImage(imageBuffer,mimeType);

        return {
            text: extractedText,
            confidence: 100
        };
    }
}