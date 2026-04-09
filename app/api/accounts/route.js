import { NextResponse } from 'next/server';
import { getAccounts, createAccount } from '@/lib/supabase';
import { MOCK_MODE } from '@/lib/google-ads-mock';

const MOCK_ACCOUNT = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Demo HVAC Account',
  google_customer_id: '1234567890',
  status: 'active',
  last_synced_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

export async function GET() {
  if (MOCK_MODE) return NextResponse.json([MOCK_ACCOUNT]);
  try {
    const accounts = await getAccounts();
    return NextResponse.json(accounts);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process accounts request' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const account = await createAccount(body);
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process accounts request' }, { status: 500 });
  }
}
