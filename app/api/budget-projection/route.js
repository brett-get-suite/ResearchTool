import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { budgetProjectionPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { apiKey, businessName, industry, serviceAreas, keywordData, competitorData } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    const prompt = budgetProjectionPrompt(businessName, industry, serviceAreas, keywordData, competitorData);
    const raw = await callGemini(geminiKey, prompt, { maxTokens: 16384 });
    const data = parseGeminiJSON(raw);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Budget projection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate budget projection' },
      { status: 500 }
    );
  }
}
