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
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * Parse JSON from Gemini response, handling markdown code fences and common LLM quirks
 */
export function parseGeminiJSON(text) {
  let cleaned = text.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Fallback: fix trailing commas and single quotes
    cleaned = cleaned
      .replace(/,\s*([}\]])/g, '$1')        // trailing commas
      .replace(/'/g, '"')                     // single → double quotes
      .replace(/(\w+)\s*:/g, '"$1":')        // unquoted keys
      .replace(/""+/g, '"');                  // dedupe quotes from double-fixing
    return JSON.parse(cleaned);
  }
}
