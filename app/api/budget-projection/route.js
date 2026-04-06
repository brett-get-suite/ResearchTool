import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { budgetProjectionPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

export const maxDuration = 60;

export async function POST(req) {
  const { allowed } = checkRateLimit(req, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }
  try {
    const { apiKey, businessName, industry, serviceAreas, keywordData, competitorData, calibration, seasonalMultipliers } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    const prompt = budgetProjectionPrompt(businessName, industry, serviceAreas, keywordData, competitorData, calibration, seasonalMultipliers);
    const raw = await callGemini(geminiKey, prompt, { maxTokens: 8192, thinkingBudget: 1024 });
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
