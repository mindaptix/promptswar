import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
const store = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => store }));
import { hashPassword, verifyPassword, setSession, getSessionUserId, clearSession } from '@/shared/server/auth';
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());
describe('real password hashing and signed sessions', () => {
  it('hashes with salt; verifies correct password and rejects wrong password', async () => {
    const first = await hashPassword('a-valid-password');
    const second = await hashPassword('a-valid-password');
    expect(first).not.toBe(second);
    expect(first).not.toContain('a-valid-password');
    expect(await verifyPassword('a-valid-password', first)).toBe(true);
    expect(await verifyPassword('wrong-password', first)).toBe(false);
  }, 30000);
  it('returns no session when cookie is missing', async () => {
    store.get.mockReturnValue(undefined);
    expect(await getSessionUserId()).toBeNull();
  });
  it.each(['bad-token', '', 'eyJhbGciOiJub25lIn0.e30.'])('rejects invalid token %#', async (value) => {
    store.get.mockReturnValue({ value });
    expect(await getSessionUserId()).toBeNull();
  });
  it('round trips a signed cookie with secure production settings', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await setSession('user-a');
    const [name, token, settings] = store.set.mock.calls[0];
    expect(name).toBe('promptswar_session');
    expect(settings).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 2592000 });
    store.get.mockReturnValue({ value: token });
    expect(await getSessionUserId()).toBe('user-a');
  });
  it('rejects tampered payload', async () => {
    await setSession('user-a');
    const token = store.set.mock.calls[0][1] as string;
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ sub: 'victim' })).toString('base64url');
    store.get.mockReturnValue({ value: parts.join('.') });
    expect(await getSessionUserId()).toBeNull();
  });
  it('rejects expired token', async () => {
    const key = new TextEncoder().encode(process.env.AUTH_SECRET || 'local-development-secret-change-me');
    const token = await new SignJWT({ sub: 'user-a' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(1).sign(key);
    store.get.mockReturnValue({ value: token });
    expect(await getSessionUserId()).toBeNull();
  });
  it('deletes the expected session cookie', async () => {
    await clearSession();
    expect(store.delete).toHaveBeenCalledWith('promptswar_session');
  });
});
