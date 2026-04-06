import { NextResponse } from 'next/server';
import { getAgentActions } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const agentType = searchParams.get('type') || undefined;

    const actions = await getAgentActions(params.id, { limit, offset, agentType });
    return NextResponse.json(actions);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
