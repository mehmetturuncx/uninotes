import { type OcrResult } from "./ocr.types"

export const isOcrQualityAcceptable = (result: OcrResult): boolean => {
    if (!result.text || result.confidence === undefined) {         
        return false;                                              
    }
    const confidence = result.confidence;
    const total_characters = result.text?.trim();
    const number_of_alphanumeric_characters = countAlphanumeric(total_characters);

    if (confidence >= 60 && total_characters?.replace(/\s+/g, '').length >= 10 && number_of_alphanumeric_characters / total_characters?.replace(/\s+/g, '').length >= 0.65) {
        return true;
    }

    return false;
}

export const isPdfAcceptable = (text?: string | null): boolean => {
    if (!text || !text.trim()) return false;

    const cleanText = text.replace(/\s+/g, '');
    
    if (cleanText.length < 30) return false;

    const number_of_alphanumeric_characters = countAlphanumeric(cleanText);

    const ratio = number_of_alphanumeric_characters / cleanText.length;

    return ratio >= 0.65;
}



function countAlphanumeric(str: string): number {
  const matches = str.match(/[a-zA-Z0-9çşğüöıÇŞĞÜÖİ]/g);
  return matches ? matches.length : 0;
}