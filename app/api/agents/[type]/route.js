import { NextResponse } from 'next/server';
import { runAgent, AGENT_TYPES } from '@/lib/agents/index';
import { checkRateLimit } from '@/lib/rateLimit';

// POST /api/agents/[type]
// Body: { accountId }
export async function POST(request, { params }) {
  const { allowed } = checkRateLimit(request, { limit: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }
  try {
    const { type } = params;
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }
    if (!AGENT_TYPES.includes(type)) {
      return NextResponse.json({ error: `Unknown agent type: ${type}` }, { status: 400 });
    }

    const result = await runAgent(type, accountId, 'manual');
    return NextResponse.json({ type, accountId, ...result });
  } catch (err) {
    console.error(`Agent [${params.type}] error:`, err);
    return NextResponse.json({ error: 'Agent execution failed' }, { status: 500 });
  }
}
