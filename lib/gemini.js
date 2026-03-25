import { GoogleGenerativeAI } from '@google/generative-ai';

export function getGeminiClient(apiKey) {
  return new GoogleGenerativeAI(apiKey);
}

export async function callGemini(apiKey, prompt, { temperature = 0.3, maxTokens = 8192 } = {}) {
  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * Parse JSON from Gemini response, handling markdown code fences
 */
export function parseGeminiJSON(text) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return JSON.parse(cleaned.trim());
}
