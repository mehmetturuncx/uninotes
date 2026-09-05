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

describe('Heuristic PDF Quality Gate (isPdfAcceptable)', () => {
  it('Anlamlı ve yeterli uzunluktaki Türkçe dijital PDF metni için true dönmeli', async () => {
    const { isPdfAcceptable } = await import('../src/services/ocr/qualityGate');
    const text = 'Bilgisayar Mühendisliği Algoritmalar Dersi: Sıralama algoritmaları ve karmaşıklık analizi vize hazırlık notları.';
    expect(isPdfAcceptable(text)).toBe(true);
  });

  it('Boş, null veya sadece boşluk/satır sonu içeren PDF çıktısında false dönmeli', async () => {
    const { isPdfAcceptable } = await import('../src/services/ocr/qualityGate');
    expect(isPdfAcceptable('')).toBe(false);
    expect(isPdfAcceptable('   \n\t   \n  ')).toBe(false);
    expect(isPdfAcceptable(null as any)).toBe(false);
    expect(isPdfAcceptable(undefined as any)).toBe(false);
  });

  it('Sadece sayfa numarası veya kısa başlık kırıntısı olan (< 30 karakter) PDF çıktısında false dönmeli', async () => {
    const { isPdfAcceptable } = await import('../src/services/ocr/qualityGate');
    expect(isPdfAcceptable('Sayfa 1 / 15')).toBe(false);
    expect(isPdfAcceptable('Matematik 1')).toBe(false);
  });

  it('Bozuk font veya yoğun sembol içeren gürültülü (< %65 alfanümerik) PDF çıktısında false dönmeli', async () => {
    const { isPdfAcceptable } = await import('../src/services/ocr/qualityGate');
    const corruptedText = '!!!@@@###$$$%%%^^^&&&*** \x00\x01\x02 ???~~~ Ders';
    expect(isPdfAcceptable(corruptedText)).toBe(false);
  });
});
