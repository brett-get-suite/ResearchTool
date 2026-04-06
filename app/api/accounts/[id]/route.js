import { NextResponse } from 'next/server';
import { getAccount, updateAccount, deleteAccount } from '@/lib/supabase';

export async function GET(request, { params }) {
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
    const account = await updateAccount(params.id, body);
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
