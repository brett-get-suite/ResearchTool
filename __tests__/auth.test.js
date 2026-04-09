import { hashPassword, verifyPassword, generateSessionToken, generateInviteToken } from '../lib/auth.js';

describe('hashPassword', () => {
  test('returns salt:hash format', async () => {
    const result = await hashPassword('testpassword');
    expect(result).toMatch(/^[a-f0-9]{32}:[a-f0-9]{64}$/);
  });

  test('different calls produce different hashes (random salt)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  test('returns true for correct password', async () => {
    const hash = await hashPassword('mypassword');
    const result = await verifyPassword('mypassword', hash);
    expect(result).toBe(true);
  });

  test('returns false for wrong password', async () => {
    const hash = await hashPassword('mypassword');
    const result = await verifyPassword('wrong', hash);
    expect(result).toBe(false);
  });
});

describe('generateSessionToken', () => {
  test('returns 64-char hex string', () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  test('is unique each call', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
  });
});

describe('generateInviteToken', () => {
  test('returns a base64url string', () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
  });
});
