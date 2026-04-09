import { NextResponse } from 'next/server';
import { runAgent, AGENT_TYPES } from '@/lib/agents/index';
import { checkRateLimit } from '@/lib/rateLimit';

// POST /api/agents/run
// Body: { type, accountId, trigger? }
// OR: { accountId } to run all scheduled agents for an account
export async function POST(request) {
  const { allowed } = checkRateLimit(request, { limit: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }
  try {
    const { type, accountId, trigger = 'scheduled' } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    if (type) {
      // Run a specific agent
      if (!AGENT_TYPES.includes(type)) {
        return NextResponse.json({ error: `Unknown agent type. Valid: ${AGENT_TYPES.join(', ')}` }, { status: 400 });
      }
      const result = await runAgent(type, accountId, trigger);
      return NextResponse.json({ type, accountId, ...result });
    } else {
      // Run all scheduled agents (exclude 'brand' and 'audit' which are triggered separately)
      const CRON_EXCLUDED = new Set(['brand', 'audit']);
      const scheduledTypes = AGENT_TYPES.filter(t => !CRON_EXCLUDED.has(t));
      const results = {};
      for (const agentType of scheduledTypes) {
        try {
          results[agentType] = await runAgent(agentType, accountId, 'scheduled');
        } catch (err) {
          results[agentType] = { success: false, error: err.message };
        }
      }
      return NextResponse.json({ accountId, results });
    }
  } catch (err) {
    console.error('Agent run error:', err);
    return NextResponse.json({ error: 'Agent run failed' }, { status: 500 });
  }
}
