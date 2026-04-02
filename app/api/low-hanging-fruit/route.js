import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { lowHangingFruitPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req) {
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
      { error: error.message || 'Failed to analyze opportunities' },
      { status: 500 }
    );
  }
}
