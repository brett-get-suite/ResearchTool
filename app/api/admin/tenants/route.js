import { NextResponse } from 'next/server';
import { getTenants, createTenant } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth-context';

export async function GET(request) {
  const user = getAuthUser(request);
  if (user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const tenants = await getTenants();
    return NextResponse.json(tenants);
  } catch (err) {
    console.error('Tenants GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = getAuthUser(request);
  if (user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const tenant = await createTenant(name.trim());
    return NextResponse.json(tenant, { status: 201 });
  } catch (err) {
    console.error('Tenants POST error:', err);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}
