import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const state = vi.hoisted(() => ({ db: undefined as unknown as PGlite, userId: 'user-a' as string | null }));
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
vi.mock('@/shared/server/auth', () => ({ getSessionUserId: async () => state.userId }));

import { POST as draft } from '@/app/api/complaints/draft/route';
import { GET as list, POST as save } from '@/app/api/complaints/route';
import { GET as show, PUT as update } from '@/app/api/complaints/[id]/route';
import { resetRateLimits } from '@/shared/server/guard';

const json = (url: string, body: unknown, method = 'POST') => new Request(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const facts = { category: 'payment', platform: 'FastCart', incidentDate: '2026-08-11', amount: 4250, referenceId: 'ORD-32', location: '', description: 'Week 32 payout is still missing from my bank account.', desiredResolution: 'release the payout' };

beforeAll(async () => { state.db = await PGlite.create(); });
afterAll(async () => { await state.db.close(); });
beforeEach(async () => {
  resetRateLimits();
  state.userId = 'user-a';
  await state.db.exec('DROP TABLE IF EXISTS complaints; DROP TABLE IF EXISTS documents; DROP TABLE IF EXISTS earnings; DROP TABLE IF EXISTS users;');
  await state.db.exec((await import('@/shared/server/postgres')).SCHEMA_SQL);
  await state.db.exec("INSERT INTO users (id, email, password_hash) VALUES ('user-a', 'a@x.com', 'h'), ('user-b', 'b@x.com', 'h')");
});

describe('complaint drafting and ownership', () => {
  it('builds an editable template that marks missing details and does not invent numbers', async () => {
    const response = await draft(json('http://localhost/api/complaints/draft', { facts: { ...facts, amount: null, referenceId: '' }, language: 'en', mode: 'template' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe('template');
    expect(body.missing).toEqual(expect.arrayContaining(['amount', 'reference_id']));
    expect(body.draft.facts.join("\n")).toContain("[Amount in ₹]");
    expect(body.unsupported).toEqual([]);
  });

  it('rejects a description that is too short before any draft is stored', async () => {
    const response = await draft(json('http://localhost/api/complaints/draft', { facts: { ...facts, description: 'too short' }, mode: 'template' }));
    expect(response.status).toBe(400);
    expect((await response.json()).fields.description).toBe('too_short');
  });

  it('saves, updates, exports the same text shape, and hides the complaint from another user', async () => {
    const drafted = await (await draft(json('http://localhost/api/complaints/draft', { facts, language: 'en', mode: 'template' }))).json();
    const created = await save(json('http://localhost/api/complaints', { facts, draft: drafted.draft, language: 'en' }));
    expect(created.status).toBe(201);
    const { complaint } = await created.json();
    expect(complaint.draft.subject).toContain('FastCart');

    const edited = { ...complaint.draft, subject: 'Edited subject' };
    expect((await update(json(`http://localhost/api/complaints/${complaint.id}`, { draft: edited }, 'PUT'), { params: Promise.resolve({ id: complaint.id }) })).status).toBe(200);
    const reopened = await (await show(new Request(`http://localhost/api/complaints/${complaint.id}`), { params: Promise.resolve({ id: complaint.id }) })).json();
    expect(reopened.complaint.draft.subject).toBe('Edited subject');
    expect((await (await list()).json()).complaints).toHaveLength(1);

    state.userId = 'user-b';
    expect((await show(new Request(`http://localhost/api/complaints/${complaint.id}`), { params: Promise.resolve({ id: complaint.id }) })).status).toBe(404);
    expect((await (await list()).json()).complaints).toEqual([]);
  });

  it('requires a session', async () => {
    state.userId = null;
    expect((await list()).status).toBe(401);
    expect((await save(json('http://localhost/api/complaints', { facts, draft: {}, language: 'en' }))).status).toBe(401);
  });
});
