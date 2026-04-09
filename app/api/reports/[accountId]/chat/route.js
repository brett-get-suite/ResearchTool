// app/api/reports/[accountId]/chat/route.js
import { NextResponse } from 'next/server';
import { getReportAnalysis } from '@/lib/supabase';
import { callGemini, parseGeminiJSON } from '@/lib/gemini';

const SYSTEM_PROMPT = (mode, summary) => `You are an expert PPC account analyst. You're analyzing a Google Ads account in ${mode === 'ecommerce' ? 'e-commerce (ROAS-focused)' : 'lead generation (CPA-focused)'} mode.

Account summary: $${summary?.totalSpend} total spend, ${summary?.totalConversions} conversions, ${mode === 'ecommerce' ? 'avg ROAS ' + summary?.avgRoas : 'avg CPA $' + summary?.avgCpa}, $${summary?.totalWasted} wasted (${summary?.wastedPct}% of total).

You have the full computed analysis (n-gram table, keyword analysis, campaign data) as context. Answer questions precisely, cite specific numbers from the data, and give actionable recommendations. When the user asks about a specific term or theme, pull the exact data point. Keep responses concise — 2-4 sentences for simple questions, structured lists for complex ones.

Return JSON: {"response": "your answer here"}`;

export async function POST(request, { params }) {
  const { accountId } = await params;
  try {
    const { analysisId, messages, focusContext } = await request.json();

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 });
    }

    const analysis = await getReportAnalysis(analysisId);
    if (!analysis || analysis.account_id !== accountId) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const { computed_data: data, mode } = analysis;

    // Build context — compact summary of computed data (keep tokens manageable)
    const contextBlock = JSON.stringify({
      summary:  data.summary,
      topNgrams: (data.ngrams?.table || []).slice(0, 30),
      wastedTerms: (data.keywords?.zeroConvTerms || []).slice(0, 20),
      topSpenders: (data.keywords?.topSpenders || []).slice(0, 15),
      negativeGaps: data.keywords?.negativeGaps || [],
      campaigns: data.campaigns?.rankedCampaigns || [],
      swot: analysis.swot || null,
      actionItems: analysis.action_items || null,
    });

    const focusLine = focusContext
      ? `\n\nUSER IS FOCUSED ON: ${JSON.stringify(focusContext)}`
      : '';

    const systemMsg = SYSTEM_PROMPT(mode, data.summary) +
      `\n\nFULL COMPUTED DATA:\n${contextBlock}` +
      focusLine;

    // Build message history for Gemini
    const conversationHistory = (messages || [])
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `${systemMsg}\n\nCONVERSATION:\n${conversationHistory}\n\nRespond with JSON: {"response": "..."}`;

    const raw = await callGemini(process.env.GEMINI_API_KEY, prompt, {
      temperature: 0.4,
      maxTokens: 2048,
      thinkingBudget: 512,
    });

    const parsed = parseGeminiJSON(raw);
    return NextResponse.json({ response: parsed.response || raw });
  } catch (err) {
    console.error('[reports/chat] Error:', err);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
