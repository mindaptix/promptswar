import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { guardMutation, resetRateLimits } from '@/shared/server/guard';
import { authSecretBytes } from '@/shared/auth-secret';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/server/postgres', () => ({ ensureSchema: vi.fn(), query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) }));
vi.mock('@/shared/server/auth', () => ({ verifyPassword: vi.fn(), setSession: vi.fn() }));

const post = (origin?: string) => new Request('http://localhost/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
  body: JSON.stringify({ email: 'a@b.com', password: 'secret123' }),
});

beforeEach(() => resetRateLimits());

describe('request guards', () => {
  it('rejects a foreign Origin on a cookie mutation', async () => {
    expect((await login(post('https://evil.example'))).status).toBe(403);
  });
  it('allows the same origin', async () => {
    expect((await login(post('http://localhost'))).status).not.toBe(403);
  });
  it('allows the public origin behind a reverse proxy', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://promptswar.example.io', 'x-forwarded-host': 'promptswar.example.io', 'x-forwarded-proto': 'https' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret123' }),
    });
    expect((await login(request)).status).not.toBe(403);
  });
  it('still rejects a foreign Origin behind a reverse proxy', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example', 'x-forwarded-host': 'promptswar.example.io' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret123' }),
    });
    expect((await login(request)).status).toBe(403);
  });
  it('returns 429 after the auth bucket is full', () => {
    const request = post();
    for (let i = 0; i < 20; i += 1) expect(guardMutation(request, 'auth')).toBeNull();
    expect(guardMutation(request, 'auth')?.status).toBe(429);
  });
  it('refuses to sign sessions in production without a long AUTH_SECRET', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', 'short');
    expect(() => authSecretBytes()).toThrow(/32 characters/);
    vi.unstubAllEnvs();
  });
});
