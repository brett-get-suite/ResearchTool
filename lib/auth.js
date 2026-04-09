import crypto from 'crypto';

/**
 * Hash a password with PBKDF2 + random salt.
 * Returns "salt:hash" (both hex-encoded).
 */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await pbkdf2(password, salt);
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored "salt:hash" string.
 */
export async function verifyPassword(password, stored) {
  const [salt, storedHash] = stored.split(':');
  const computed = await pbkdf2(password, salt);
  // Timing-safe comparison
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function pbkdf2(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100_000, 32, 'sha256', (err, key) => {
      if (err) reject(err);
      else resolve(key.toString('hex'));
    });
  });
}

/** Generate a cryptographically random session token (64 hex chars). */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Generate a URL-safe invite token (base64url). */
export function generateInviteToken() {
  return crypto.randomBytes(32).toString('base64url');
}
