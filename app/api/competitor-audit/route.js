import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { competitorAuditPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

export const maxDuration = 60;

export async function POST(req) {
  const { allowed } = checkRateLimit(req, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }
  try {
    const { apiKey, businessName, services, serviceAreas, industry } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    const competitorPrompt = competitorAuditPrompt(businessName, services, serviceAreas, industry);
    const competitorRaw = await callGemini(geminiKey, competitorPrompt, { maxTokens: 8192, thinkingBudget: 1024 });
    const competitorData = parseGeminiJSON(competitorRaw);

    return NextResponse.json({ success: true, data: competitorData });
  } catch (error) {
    console.error('Competitor audit error:', error);
    return NextResponse.json(
      { error: 'Failed to run competitor audit' },
      { status: 500 }
    );
  }
}
