import { GoogleGenAI } from '@google/genai';

const MAX_RETRIES = 1;
const RETRY_DELAY = 500;

export async function callGemini(apiKey, prompt, { temperature = 0.3, maxTokens = 16384, thinkingBudget = 1024 } = {}) {
  const ai = new GoogleGenAI({ apiKey });

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingBudget,
          },
        },
      });

      const text = response.text;
      if (!text || text.trim().length === 0) {
        throw new Error('Gemini returned an empty response');
      }

      // Validate it's parseable before returning
      parseGeminiJSON(text);
      return text;
    } catch (err) {
      lastError = err;
      console.error(`Gemini call attempt ${attempt + 1} failed:`, err.message);

      if (attempt < MAX_RETRIES) {
        // Don't retry on auth/config/parameter errors
        if (err.message?.includes('API key') || err.message?.includes('API_KEY_INVALID') || err.status === 401 || err.status === 403 || err.status === 400) {
          throw err;
        }
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }

  throw lastError;
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

  // Attempt 4: strip control characters that break JSON
  fixed = cleaned
    .replace(/[\x00-\x1f\x7f]/g, (ch) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '')
    .replace(/,\s*([}\]])/g, '$1');
  fixed = repairTruncated(fixed);
  try { return JSON.parse(fixed); } catch (_) {}

  // Attempt 5: nuclear option — escape unescaped quotes inside string values
  fixed = fixUnescapedQuotes(cleaned);
  fixed = repairTruncated(fixed);
  try { return JSON.parse(fixed); } catch (_) {}

  // Final: throw with context
  throw new Error(`Failed to parse Gemini JSON (length: ${text.length}). First 300 chars: ${text.slice(0, 300)}`);
}

/**
 * Close unclosed strings, arrays, and objects in truncated JSON
 */
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
  if (inStr) str += '"';
  // Remove trailing incomplete key-value pairs
  str = str.replace(/,\s*"[^"]*"?\s*:?\s*$/, '');
  str = str.replace(/,\s*$/, '');
  for (let i = 0; i < openBrackets; i++) str += ']';
  for (let i = 0; i < openBraces; i++) str += '}';
  return str;
}

/**
 * Try to fix unescaped double quotes inside JSON string values
 */
function fixUnescapedQuotes(str) {
  let result = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (esc) {
      result += c;
      esc = false;
      continue;
    }
    if (c === '\\') {
      result += c;
      esc = true;
      continue;
    }
    if (c === '"') {
      if (!inStr) {
        inStr = true;
        result += c;
      } else {
        // Check if this quote ends the string value (next non-whitespace should be , or } or ] or :)
        const rest = str.slice(i + 1).trimStart();
        if (rest.length === 0 || /^[,}\]:]/.test(rest)) {
          inStr = false;
          result += c;
        } else {
          // It's an unescaped quote inside a string — escape it
          result += '\\"';
        }
      }
    } else {
      result += c;
    }
  }
  return result;
}
