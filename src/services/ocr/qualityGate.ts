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

function countAlphanumeric(str: string): number {
  const matches = str.match(/[a-zA-Z0-9çşğüöıÇŞĞÜÖİ]/g);
  return matches ? matches.length : 0;
}