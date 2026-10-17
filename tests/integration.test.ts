import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL (WASM) behind the real routes, service, repository, and schema.
// Only the session cookie and password hashing are replaced.
const state = vi.hoisted(() => ({ db: undefined as unknown as PGlite, sessionUserId: null as string | null, sessions: [] as string[] }));

vi.mock('server-only', () => ({}));
vi.mock('@/shared/server/postgres', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/server/postgres')>();
  return {
    ...actual,
    ensureSchema: () => state.db.exec(actual.SCHEMA_SQL).then(() => undefined),
    query: async (text: string, values: unknown[] = []) => {
      const result = await state.db.query(text, values);
      return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
    },
  };
});
vi.mock('@/shared/server/auth', () => ({
  getSessionUserId: async () => state.sessionUserId,
  setSession: async (id: string) => { state.sessions.push(id); },
  hashPassword: async (password: string) => { await new Promise((resolve) => setTimeout(resolve, 5)); return `hashed:${password}`; },
  verifyPassword: async (password: string, hash: string) => hash === `hashed:${password}`,
}));

import { POST as signup } from '@/app/api/auth/signup/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as list, POST as save } from '@/app/api/earnings/route';

const post = (body: unknown) => new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
const as = (userId: string | null) => { state.sessionUserId = userId; };

async function createUser(email: string) {
  state.sessions = [];
  expect((await signup(post({ email, password: 'secret123' }))).status).toBe(200);
  return state.sessions[0];
}

beforeAll(async () => { state.db = await PGlite.create(); });
afterAll(async () => { if (!state.db.closed) await state.db.close(); });
beforeEach(async () => {
  const { resetRateLimits } = await import('@/shared/server/guard');
  resetRateLimits();
  as(null);
  state.sessions = [];
  await state.db.exec('DROP TABLE IF EXISTS complaints; DROP TABLE IF EXISTS documents; DROP TABLE IF EXISTS earnings; DROP TABLE IF EXISTS users;');
});

describe('PostgreSQL integration: accounts', () => {
  it('persists a user and logs in with the stored hash', async () => {
    const id = await createUser('Worker@Example.com');
    const { rows } = await state.db.query<{ email: string; password_hash: string }>('SELECT email, password_hash FROM users WHERE id = $1', [id]);
    expect(rows).toEqual([{ email: 'worker@example.com', password_hash: 'hashed:secret123' }]);
    expect((await login(post({ email: ' WORKER@example.com ', password: 'secret123' }))).status).toBe(200);
    expect((await login(post({ email: 'worker@example.com', password: 'wrong-password' }))).status).toBe(401);
  });

  it('rejects a sequential duplicate signup after email normalization', async () => {
    await createUser('dup@example.com');
    expect((await signup(post({ email: ' DUP@example.com ', password: 'secret123' }))).status).toBe(409);
  });

  it('allows exactly one account when duplicate signups race', async () => {
    const statuses = (await Promise.all(Array.from({ length: 5 }, () => signup(post({ email: 'race@example.com', password: 'secret123' }))))).map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(4);
    const { rows } = await state.db.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM users');
    expect(rows[0].count).toBe(1);
    expect(state.sessions).toHaveLength(1);
  });
});

describe('PostgreSQL integration: earnings authorization and isolation', () => {
  it('rejects anonymous reads and writes without storing anything', async () => {
    expect((await list()).status).toBe(401);
    expect((await save(post({ income: 100 }))).status).toBe(401);
    await createUser('owner@example.com');
    const { rows } = await state.db.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM earnings');
    expect(rows[0].count).toBe(0);
  });

  it('returns only the signed-in user\'s entries', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');

    as(alice);
    expect((await save(post({ income: 500, expense: 50 }))).status).toBe(201);
    expect((await save(post({ income: 1.1 }))).status).toBe(201);
    as(bob);
    expect((await save(post({ income: 999, userId: alice }))).status).toBe(201);

    as(alice);
    const aliceEntries = (await (await list()).json()).entries;
    expect(aliceEntries.map((e: { income: number }) => e.income).sort()).toEqual([110, 50000]);

    as(bob);
    const bobEntries = (await (await list()).json()).entries;
    expect(bobEntries).toHaveLength(1);
    expect(bobEntries[0]).toMatchObject({ income: 99900, expense: 0 });

    const { rows } = await state.db.query<{ user_id: string }>('SELECT user_id FROM earnings WHERE income = 99900');
    expect(rows).toEqual([{ user_id: bob }]);
  });

  it('a session for a deleted user cannot store earnings', async () => {
    const ghost = await createUser('ghost@example.com');
    await state.db.query('DELETE FROM users WHERE id = $1', [ghost]);
    as(ghost);
    expect((await save(post({ income: 10 }))).status).toBe(503);
  });

  it('stores nothing for invalid input', async () => {
    as(await createUser('strict@example.com'));
    for (const body of [{ income: -1 }, { income: '10' }, { income: true }, { income: 0, expense: 0 }, { income: 1_000_001 }, { income: 0.001 }]) {
      expect((await save(post(body))).status).toBe(400);
    }
    const { rows } = await state.db.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM earnings');
    expect(rows[0].count).toBe(0);
  });
});

describe('PostgreSQL integration: database failure', () => {
  it('returns controlled errors without leaking details when the database is down', async () => {
    const user = await createUser('down@example.com');
    await state.db.close();
    as(user);
    for (const response of [await list(), await save(post({ income: 10 }))]) {
      expect(response.status).toBe(503);
      expect(await response.text()).not.toMatch(/pglite|closed|stack/i);
    }
    as(null);
    expect((await login(post({ email: 'down@example.com', password: 'secret123' }))).status).toBe(500);
    expect((await signup(post({ email: 'new@example.com', password: 'secret123' }))).status).toBe(500);
  });
});
