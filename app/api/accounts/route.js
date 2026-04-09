import { NextResponse } from 'next/server';
import { getAccountsByTenant, getAllAccounts, createAccount } from '@/lib/supabase';
import { MOCK_MODE, MOCK_ACCOUNT } from '@/lib/google-ads-mock';
import { getAuthUser } from '@/lib/auth-context';

export async function GET(request) {
  if (MOCK_MODE) return NextResponse.json([MOCK_ACCOUNT]);
  try {
    const user = getAuthUser(request);
    const accounts = user?.role === 'superadmin'
      ? await getAllAccounts()
      : await getAccountsByTenant(user?.tenantId);
    return NextResponse.json(accounts);
  } catch (err) {
    console.error('Accounts GET error:', err);
    return NextResponse.json({ error: 'Failed to process accounts request' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request);
    const body = await request.json();
    const account = await createAccount({ ...body, tenant_id: user?.tenantId || null });
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    console.error('Accounts POST error:', err);
    return NextResponse.json({ error: 'Failed to process accounts request' }, { status: 500 });
  }
}
