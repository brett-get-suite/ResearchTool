import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { landingPageAuditPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { apiKey, websiteUrl, services, industry } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }
    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    const prompt = landingPageAuditPrompt(websiteUrl, services || [], industry || 'Home Services');
    const raw = await callGemini(geminiKey, prompt, { maxTokens: 8192, thinkingBudget: 1024 });
    const data = parseGeminiJSON(raw);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Landing page audit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to audit landing pages' },
      { status: 500 }
    );
  }
}
