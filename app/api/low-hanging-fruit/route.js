import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { lowHangingFruitPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

export const maxDuration = 60;

export async function POST(req) {
  const { allowed } = checkRateLimit(req, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }
  try {
    const { apiKey, keywordData, competitorData, industry, serviceAreas } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    const fruitPrompt = lowHangingFruitPrompt(keywordData, competitorData, industry, serviceAreas);
    const fruitRaw = await callGemini(geminiKey, fruitPrompt, { maxTokens: 8192, thinkingBudget: 1024 });
    const fruitData = parseGeminiJSON(fruitRaw);

    return NextResponse.json({ success: true, data: fruitData });
  } catch (error) {
    console.error('Low-hanging fruit analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze opportunities' },
      { status: 500 }
    );
  }
}
