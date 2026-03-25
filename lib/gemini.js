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
 * Parse JSON from Gemini response with progressive repair strategies
 */
export function parseGeminiJSON(text) {
  let cleaned = text.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  // Attempt 1: direct parse
  try { return JSON.parse(cleaned); } catch (_) {}

  // Attempt 2: fix trailing commas
  let fixed = cleaned.replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(fixed); } catch (_) {}

  // Attempt 3: fix truncated JSON by closing open brackets/braces
  fixed = repairTruncated(fixed);
  try { return JSON.parse(fixed); } catch (_) {}

  // Attempt 4: strip control characters inside strings that break JSON
  fixed = cleaned
    .replace(/[\x00-\x1f\x7f]/g, (ch) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '')
    .replace(/,\s*([}\]])/g, '$1');
  fixed = repairTruncated(fixed);
  try { return JSON.parse(fixed); } catch (_) {}

  // Attempt 5: extract first complete JSON object/array from the text
  const match = cleaned.match(/[\[{]/);
  if (match) {
    const start = match.index;
    const opener = cleaned[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === opener || c === (opener === '{' ? '[' : '{')) depth++;
      if (c === closer || c === (closer === '}' ? ']' : '}')) depth--;
      if (depth === 0) {
        try { return JSON.parse(cleaned.slice(start, i + 1)); } catch (_) { break; }
      }
    }
  }

  // Final: throw with context about where the parse failed
  throw new Error(`Failed to parse Gemini JSON response (length: ${text.length}). First 200 chars: ${text.slice(0, 200)}`);
}

function repairTruncated(str) {
  let openBraces = 0, openBrackets = 0;
  let inStr = false, esc = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') openBraces++;
    if (c === '}') openBraces--;
    if (c === '[') openBrackets++;
    if (c === ']') openBrackets--;
  }
  // Close unclosed string
  if (inStr) str += '"';
  // Remove trailing comma before we close
  str = str.replace(/,\s*$/, '');
  // Close open structures
  for (let i = 0; i < openBrackets; i++) str += ']';
  for (let i = 0; i < openBraces; i++) str += '}';
  return str;
}
