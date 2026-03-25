import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { adCopyPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { apiKey, keywordData, websiteData, industry, serviceAreas } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    const keywordGroups = keywordData?.keyword_groups || [];
    if (keywordGroups.length === 0) {
      return NextResponse.json({ error: 'Keyword data with ad groups is required' }, { status: 400 });
    }

    const prompt = adCopyPrompt(keywordGroups, websiteData, industry, serviceAreas);
    const raw = await callGemini(geminiKey, prompt, { maxTokens: 16384 });
    const data = parseGeminiJSON(raw);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Ad copy generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate ad copy' },
      { status: 500 }
    );
  }
}
