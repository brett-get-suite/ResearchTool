// app/api/reports/[accountId]/swot/route.js
import { NextResponse } from 'next/server';
import { getReportAnalysis, updateReportAnalysis } from '@/lib/supabase';
import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { buildSwotPrompt } from '@/lib/prompts/swot';

export async function POST(request, { params }) {
  const { accountId } = await params;
  try {
    const { analysisId } = await request.json();

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 });
    }

    const analysis = await getReportAnalysis(analysisId);
    if (!analysis || analysis.account_id !== accountId) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // If already generated, return cached
    if (analysis.swot) {
      return NextResponse.json({ swot: analysis.swot, actionItems: analysis.action_items });
    }

    const prompt = buildSwotPrompt(analysis.computed_data);

    const raw = await callGemini(process.env.GEMINI_API_KEY, prompt, {
      temperature: 0.3,
      maxTokens: 8192,
      thinkingBudget: 2048,
    });

    const parsed = parseGeminiJSON(raw);
    const { swot, actionItems } = parsed;

    // Cache on analysis record
    await updateReportAnalysis(analysisId, {
      swot,
      action_items: actionItems,
    });

    return NextResponse.json({ swot, actionItems });
  } catch (err) {
    console.error('[reports/swot] Error:', err);
    return NextResponse.json({ error: err.message || 'SWOT generation failed' }, { status: 500 });
  }
}
