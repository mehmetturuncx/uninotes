import { describe, it, expect } from 'vitest';
import { isOcrQualityAcceptable } from '../src/services/ocr/qualityGate';

describe('Heuristic OCR Quality Gate', () => {
  it('Yüksek güven ve anlamlı Türkçe metin için true dönmeli', () => {
    const result = {
      text: 'Matematik 1 ders notları: Türev ve integral konu anlatımı.',
      confidence: 85
    };
    expect(isOcrQualityAcceptable(result)).toBe(true);
  });

  it('Güven skoru 60 altında ise false dönmeli', () => {
    const result = {
      text: 'Matematik 1 ders notları: Türev ve integral konu anlatımı.',
      confidence: 55
    };
    expect(isOcrQualityAcceptable(result)).toBe(false);
  });

  it('Metin uzunluğu 10 karakterden az ise false dönmeli', () => {
    const result = {
      text: 'Not 1',
      confidence: 90
    };
    expect(isOcrQualityAcceptable(result)).toBe(false);
  });

  it('Gürültülü/anlamsız karakter oranı yüksekse (< %65 alfanümerik) false dönmeli', () => {
    const result = {
      text: '!!!@@@###$$$%%%^^^&&&*** Matematik',
      confidence: 75
    };
    expect(isOcrQualityAcceptable(result)).toBe(false);
  });

  it('Boş veya sadece boşluk içeren metinlerde false dönmeli', () => {
    const result = {
      text: '    ',
      confidence: 90
    };
    expect(isOcrQualityAcceptable(result)).toBe(false);
  });
});
