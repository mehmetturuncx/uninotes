import { ai, geminiModel } from "./gemini.client";

export async function extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }
    
    const base64data = imageBuffer.toString('base64');

    const response = await ai.models.generateContent({
        model: geminiModel,
        contents: [
            {
                parts: [
                    {
                        text: "Bu görseldeki tüm okunabilir metinleri eksiksiz ve olduğu gibi çıkar. Ek açıklama veya yorum yapma, yalnızca ayıklanan metni döndür."
                    },
                    {
                        inlineData: {
                            data: base64data, mimeType
                        }
                    }
                ]
            }
        ]
    });
    if (!response.text) return "";
    return response.text;
}

export async function summarizeText(textContent: string): Promise<string> {
    return "";
}