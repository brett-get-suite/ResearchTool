import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/setup', '/invite', '/api/auth/login', '/api/auth/setup', '/api/auth/register'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow public paths and static assets
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Dynamic import to avoid edge runtime issues
  const { supabase, getUserCount, getSessionByToken } = await import('./lib/supabase.js');

  // If Supabase is not configured, deny access
  if (!supabase) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return new NextResponse('Database not configured', { status: 503 });
  }

  // Check if any users exist — if not, redirect to setup
  const userCount = await getUserCount();
  if (userCount === 0) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Setup required' }, { status: 503 });
    }
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  // Validate session cookie
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await getSessionByToken(sessionToken);
  if (!session || !session.users) {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }

  const user = session.users;

  // Admin routes require superadmin role
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (user.role !== 'superadmin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Inject user context into request headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-email', user.email);
  requestHeaders.set('x-user-name', user.name || '');
  requestHeaders.set('x-user-role', user.role);
  requestHeaders.set('x-user-tenant-id', user.tenant_id || '');
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
