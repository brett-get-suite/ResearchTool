import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { keywordResearchPrompt } from '@/lib/prompts';
import { isGoogleAdsConfigured, enrichKeywordData } from '@/lib/google-ads';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { apiKey, services, serviceAreas, industry } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    // Step 1: Gemini generates keyword groups with intent + structure
    const prompt = keywordResearchPrompt(services, serviceAreas, industry);
    const raw = await callGemini(geminiKey, prompt);
    const data = parseGeminiJSON(raw);

    // Step 2: Enrich with real Google Keyword Planner data (if configured)
    if (isGoogleAdsConfigured() && data.keyword_groups) {
      try {
        await enrichKeywordData(data, serviceAreas);
        console.log(`Keyword Planner enrichment: ${data.google_enriched_count || 0} keywords enriched`);
      } catch (enrichErr) {
        console.warn('Keyword Planner enrichment failed, using Gemini estimates:', enrichErr.message);
        data.data_source = 'estimated';
        data.enrichment_error = enrichErr.message;
      }
    } else {
      data.data_source = 'estimated';
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Keyword research error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run keyword research' },
      { status: 500 }
    );
  }
}
