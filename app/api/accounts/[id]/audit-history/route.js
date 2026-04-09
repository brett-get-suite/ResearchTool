import { NextResponse } from 'next/server';
import { getAccount, getAuditScoreHistory } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const id = params.id;
    const account = await getAccount(id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    const history = await getAuditScoreHistory(id, limit);
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
