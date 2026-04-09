import { NextResponse } from 'next/server';
import { updateTenant, deleteTenant } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth-context';

export async function PUT(request, { params }) {
  const user = getAuthUser(request);
  if (user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { name } = await request.json();
    const tenant = await updateTenant(params.id, { name });
    return NextResponse.json(tenant);
  } catch (err) {
    console.error('Tenant PUT error:', err);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = getAuthUser(request);
  if (user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await deleteTenant(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Tenant DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
