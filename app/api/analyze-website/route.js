import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { websiteAnalysisPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { apiKey, websiteUrl, industry } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    const prompt = websiteAnalysisPrompt(websiteUrl, industry);
    const raw = await callGemini(geminiKey, prompt);
    const data = parseGeminiJSON(raw);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Website analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze website' },
      { status: 500 }
    );
  }
}
