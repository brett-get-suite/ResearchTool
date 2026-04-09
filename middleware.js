import { NextResponse } from 'next/server';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

async function computeSessionToken(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'ads-recon-v1');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;

  // Fail closed — if ADMIN_PASSWORD is not configured, deny access
  if (!adminPassword) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 503 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const sessionCookie = request.cookies.get('session')?.value;
  const expectedToken = await computeSessionToken(adminPassword);

  if (sessionCookie !== expectedToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
