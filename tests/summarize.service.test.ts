import { describe, it, expect, vi, beforeEach } from 'vitest';

// Gemini client mock
export const generateContentMock = vi.fn();

vi.mock('../src/services/ai/gemini.client', () => ({
  geminiModel: 'gemini-1.5-flash',
  ai: {
    models: {
      generateContent: generateContentMock
    }
  }
}));

describe('Gemini AI Service: summarizeText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  it('GEMINI_API_KEY tanımlı değilse hata fırlatmalı', async () => {
    delete process.env.GEMINI_API_KEY;
    const { summarizeText } = await import('../src/services/ai/gemini.service');

    await expect(summarizeText('Örnek ders notu metni')).rejects.toThrow(
      'GEMINI_API_KEY is not configured.'
    );
  });

  it('Metin boş veya sadece boşluklardan oluşuyorsa AI çağırmadan boş string dönmeli', async () => {
    const { summarizeText } = await import('../src/services/ai/gemini.service');

    const result = await summarizeText('   \n  \t ');
    expect(result).toBe('');
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('Geçerli metin verildiğinde Gemini modelini akademik özet promptu ile çağırıp özeti dönmeli', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: '## Özet\n- Anahtar Kavram 1\n- Anahtar Kavram 2'
    });

    const { summarizeText } = await import('../src/services/ai/gemini.service');
    const noteText = 'Yapay zeka ve makine öğrenmesi algoritmaları bilgisayarların veriden öğrenmesini sağlar.';

    const summary = await summarizeText(noteText);

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const callArgs = generateContentMock.mock.calls[0]![0];
    
    expect(callArgs).toHaveProperty('model', 'gemini-1.5-flash');
    expect(callArgs).toHaveProperty('contents');
    
    // Prompt içeriğini doğrula (not metni gönderilmeli)
    const promptText = JSON.stringify(callArgs.contents);
    expect(promptText).toContain(noteText);

    expect(summary).toBe('## Özet\n- Anahtar Kavram 1\n- Anahtar Kavram 2');
  });
});
