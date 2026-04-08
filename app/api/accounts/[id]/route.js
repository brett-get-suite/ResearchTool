import { NextResponse } from 'next/server';
import { getAccount, updateAccount, deleteAccount } from '@/lib/supabase';
import { MOCK_MODE } from '@/lib/google-ads-mock';

const MOCK_ACCOUNT = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Demo HVAC Account',
  google_customer_id: '1234567890',
  status: 'active',
  last_synced_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

export async function GET(request, { params }) {
  if (MOCK_MODE) return NextResponse.json(MOCK_ACCOUNT);
  try {
    const account = await getAccount(params.id);
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(account);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const { name, settings, google_login_customer_id, status } = body;
    const account = await updateAccount(params.id, { name, settings, google_login_customer_id, status });
    return NextResponse.json(account);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const allowed = ['name', 'settings', 'mode', 'status', 'google_login_customer_id'];
    const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    const account = await updateAccount(params.id, update);
    return NextResponse.json(account);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await deleteAccount(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
