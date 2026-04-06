import { NextResponse } from 'next/server';
import { getAgentAction, markActionUndone } from '@/lib/supabase';
import { getAccountClient } from '@/lib/google-ads-auth';
import { updateKeywordBid, setKeywordStatus, updateCampaignBudget, setCampaignStatus } from '@/lib/google-ads-write';

export async function POST(request, { params }) {
  try {
    const action = await getAgentAction(params.actionId);
    if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    if (action.account_id !== params.id) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }
    if (action.status === 'undone') return NextResponse.json({ error: 'Already undone' }, { status: 400 });
    if (!action.before_state) return NextResponse.json({ error: 'No before state to restore' }, { status: 400 });

    const client = await getAccountClient(params.id);
    const resourceName = action.entity_resource_name;
    const before = action.before_state;

    if (action.entity_type === 'keyword') {
      if (before.status) await setKeywordStatus(client, resourceName, before.status);
      if (before.cpcBidMicros) await updateKeywordBid(client, resourceName, before.cpcBidMicros);
    } else if (action.entity_type === 'campaign') {
      if (before.status) await setCampaignStatus(client, resourceName, before.status);
    } else if (action.entity_type === 'budget') {
      if (before.amountMicros) await updateCampaignBudget(client, resourceName, before.amountMicros);
    }

    await markActionUndone(params.actionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Undo error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
