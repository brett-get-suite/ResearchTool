import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Try agent_runs table first
  const { data: runs, error } = await supabase
    .from('agent_runs')
    .select('*, accounts(name, customer_id)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Fallback: try agent_actions table
    const { data: actions, error: err2 } = await supabase
      .from('agent_actions')
      .select('*, accounts(name, customer_id)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (err2) return NextResponse.json([], { status: 200 });
    return NextResponse.json(actions || []);
  }

  return NextResponse.json(runs || []);
}
