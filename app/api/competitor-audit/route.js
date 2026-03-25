import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { competitorAuditPrompt, lowHangingFruitPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { apiKey, businessName, services, serviceAreas, industry, keywordData } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    // Run competitor audit
    const competitorPrompt = competitorAuditPrompt(businessName, services, serviceAreas, industry);
    const competitorRaw = await callGemini(geminiKey, competitorPrompt, { maxTokens: 16384 });
    const competitorData = parseGeminiJSON(competitorRaw);

    // Run low-hanging fruit analysis
    const fruitPrompt = lowHangingFruitPrompt(keywordData, competitorData, industry, serviceAreas);
    const fruitRaw = await callGemini(geminiKey, fruitPrompt, { maxTokens: 8192 });
    const fruitData = parseGeminiJSON(fruitRaw);

    return NextResponse.json({
      success: true,
      data: {
        competitors: competitorData,
        lowHangingFruit: fruitData,
      },
    });
  } catch (error) {
    console.error('Competitor audit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run competitor audit' },
      { status: 500 }
    );
  }
}
