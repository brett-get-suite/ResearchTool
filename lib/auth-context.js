/**
 * Extract the authenticated user from the request.
 * Middleware sets these headers after validating the session.
 * Returns null if no user is attached (should not happen on protected routes).
 */
export function getAuthUser(request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  return {
    id: userId,
    email: request.headers.get('x-user-email'),
    name: request.headers.get('x-user-name') || '',
    role: request.headers.get('x-user-role'),
    tenantId: request.headers.get('x-user-tenant-id') || null,
  };
}
