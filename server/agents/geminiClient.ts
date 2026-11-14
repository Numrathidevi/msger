import { GoogleGenAI, ThinkingLevel } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

export function hasValidGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
}

export function getGeminiClient(): GoogleGenAI | null {
  if (!hasValidGeminiKey()) return null;
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export async function generateStructuredJSON<T>(params: {
  systemInstruction: string;
  prompt: string;
  responseSchema: unknown;
}): Promise<{ data: T; usedGemini: boolean } | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema as Record<string, unknown>,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    const text = (response.text ?? '').trim();
    if (!text) return null;
    const parsed = JSON.parse(text) as T;
    return { data: parsed, usedGemini: true };
  } catch (err) {
    console.warn('[Gemini Agent] Falling back to deterministic engine:', (err as Error)?.message);
    return null;
  }
}

export async function generateTextResponse(params: {
  systemInstruction: string;
  prompt: string;
}): Promise<{ text: string; usedGemini: boolean } | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    const text = (response.text ?? '').trim();
    if (!text) return null;
    return { text, usedGemini: true };
  } catch (err) {
    console.warn('[Gemini Mentor] Falling back to deterministic engine:', (err as Error)?.message);
    return null;
  }
}
