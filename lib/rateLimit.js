// Simple in-memory rate limiter
// { [key]: { count, windowStart } }
const limits = {};

/**
 * @param {Request} req
 * @param {{ limit: number, windowMs: number }} opts
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function checkRateLimit(req, { limit = 10, windowMs = 60_000 } = {}) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const url = new URL(req.url);
  const key = `${ip}:${url.pathname}`;
  const now = Date.now();

  if (!limits[key] || now - limits[key].windowStart > windowMs) {
    limits[key] = { count: 1, windowStart: now };
    return { allowed: true, remaining: limit - 1 };
  }

  limits[key].count++;
  const remaining = Math.max(0, limit - limits[key].count);
  return { allowed: limits[key].count <= limit, remaining };
}
