import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { keywordResearchPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { apiKey, services, serviceAreas, industry } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    const prompt = keywordResearchPrompt(services, serviceAreas, industry);
    const raw = await callGemini(geminiKey, prompt, { maxTokens: 16384 });
    const data = parseGeminiJSON(raw);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Keyword research error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run keyword research' },
      { status: 500 }
    );
  }
}
