import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), ensureSchema: vi.fn(), getSessionUserId: vi.fn(), setSession: vi.fn(), verifyPassword: vi.fn(), hashPassword: vi.fn(), clearSession: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/shared/server/postgres', async (importOriginal) => ({ ...(await importOriginal<object>()), query: mocks.query, ensureSchema: mocks.ensureSchema }));
vi.mock('@/shared/server/auth', () => mocks);
import { POST as login } from '@/app/api/auth/login/route';
import { POST as signup } from '@/app/api/auth/signup/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as list, POST as save } from '@/app/api/earnings/route';
import { POST as assistant } from '@/app/api/assistant/route';
const request = (body: unknown) => new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
const invalidJSON = () => new Request('http://localhost/api/test', { method: 'POST', body: '{' });
beforeEach(async () => {
  const { resetRateLimits } = await import('@/shared/server/guard');
  resetRateLimits();
  vi.resetAllMocks();
  mocks.getSessionUserId.mockResolvedValue('user-a');
  mocks.ensureSchema.mockResolvedValue(undefined);
  mocks.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mocks.hashPassword.mockResolvedValue('hashed-password');
  vi.stubEnv('OPENAI_API_KEY', 'test-key');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ output_text: 'Helpful answer' })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('authentication routes', () => {
  it('normalizes email, verifies hash and establishes session', async () => {
    mocks.query.mockResolvedValue({ rows: [{ id: 'user-a', password_hash: 'hash' }] });
    mocks.verifyPassword.mockResolvedValue(true);
    expect((await login(request({ email: ' TEST@EXAMPLE.COM ', password: 'secret123' }))).status).toBe(200);
    expect(mocks.query.mock.calls[0][1]).toEqual(['test@example.com']);
    expect(mocks.verifyPassword).toHaveBeenCalledWith('secret123', 'hash');
    expect(mocks.setSession).toHaveBeenCalledWith('user-a');
  });
  it('rejects unknown user without creating session', async () => {
    expect((await login(request({ email: 'none@example.com', password: 'wrong' }))).status).toBe(401);
    expect(mocks.setSession).not.toHaveBeenCalled();
  });
  it('rejects wrong password', async () => {
    mocks.query.mockResolvedValue({ rows: [{ id: 'user-a', password_hash: 'hash' }] });
    mocks.verifyPassword.mockResolvedValue(false);
    expect((await login(request({ email: 'a@b.com', password: 'wrong' }))).status).toBe(401);
  });
  it.each([login, signup])('hides internal database errors', async (handler) => {
    mocks.ensureSchema.mockRejectedValue(new Error('private connection secret'));
    const response = await handler(request({ email: 'a@b.com', password: 'secret123' }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private');
  });
  it.each(['', 'bad', 'a@b', 'a b@c.com'])('rejects invalid signup email %s', async (email) => {
    expect((await signup(request({ email, password: 'secret123' }))).status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it.each(['', '1234567'])('rejects short password', async (password) => {
    expect((await signup(request({ email: 'a@b.com', password }))).status).toBe(400);
  });
  it('rejects duplicate signup', async () => {
    mocks.query.mockResolvedValue({ rowCount: 1 });
    expect((await signup(request({ email: 'a@b.com', password: 'secret123' }))).status).toBe(409);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });
  it('stores only hash and logs new user in', async () => {
    expect((await signup(request({ email: ' A@B.COM ', password: 'secret123' }))).status).toBe(200);
    const args = mocks.query.mock.calls[1][1];
    expect(args[1]).toBe('a@b.com');
    expect(args[2]).toBe('hashed-password');
    expect(mocks.setSession).toHaveBeenCalledWith(args[0]);
  });
  it('clears session on logout', async () => {
    expect((await logout()).status).toBe(200);
    expect(mocks.clearSession).toHaveBeenCalledOnce();
  });
});

describe('earnings routes', () => {
  it.each(['read', 'write'])('requires authentication for %s', async (operation) => {
    mocks.getSessionUserId.mockResolvedValue(null);
    const response = operation === 'read' ? await list() : await save(request({ income: 10 }));
    expect(response.status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('scopes list to current user and limits rows', async () => {
    const rows = [{ id: 'entry', income: 1000, expense: 200, expense_note: 'Fuel', entry_date: '2026-10-17', time: '2026-10-17' }];
    const entries = [{ id: 'entry', income: 1000, expense: 200, expenseNote: 'Fuel', date: '2026-10-17', time: '2026-10-17' }];
    mocks.query.mockResolvedValue({ rows });
    expect(await (await list()).json()).toEqual({ entries });
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT 100'), ['user-a']);
    expect(mocks.query.mock.calls[0][0]).toContain('WHERE user_id = $1');
  });
  it('returns empty account history', async () => expect(await (await list()).json()).toEqual({ entries: [] }));
  it('converts rupees to paise and ignores forged owner', async () => {
    expect((await save(request({ income: 10.25, expense: 2.5, userId: 'victim' }))).status).toBe(201);
    expect(mocks.query.mock.calls[0][1]).toEqual([expect.any(String), 'user-a', 1025, 250, '', '2026-10-17']);
  });
  it.each([{ income: 10 }, { income: 0, expense: 10 }, { income: 0.01 }])('accepts legitimate entry %j', async (body) => {
    expect((await save(request(body))).status).toBe(201);
  });
  it.each([{ income: -1 }, { income: 1, expense: -1 }, { income: 0, expense: 0 }, { income: 'not-money' }, {}])('rejects invalid amounts %j', async (body) => {
    expect((await save(request(body))).status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});

describe('AI routes (mock provider; no paid network calls)', () => {
  it('requires login', async () => {
    mocks.getSessionUserId.mockResolvedValue(null);
    expect((await assistant(request({ question: 'help' }))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reports missing configuration', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    expect((await assistant(request({ question: 'help' }))).status).toBe(503);
  });
  it('rejects malformed JSON', async () => expect((await assistant(invalidJSON())).status).toBe(400));
  it.each([undefined, '', '  ', 42, {}, [], 'x'.repeat(2001)])('rejects invalid question %#', async (question) => {
    expect((await assistant(request({ question }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['help', 'मेरी कमाई समझाओ', 'x'.repeat(2000)])('accepts valid question %#', async (question) => {
    expect(await (await assistant(request({ question }))).json()).toEqual({ answer: 'Helpful answer' });
    const options = vi.mocked(fetch).mock.calls[0][1]!;
    expect(JSON.parse(options.body as string).input).toBe(question);
  });
  it('grounds earnings answers in the authenticated user saved totals', async () => {
    mocks.query.mockResolvedValue({ rows: [{
      today_income: '125050', today_expense: '20050', today_entries: '3',
      total_income: '500000', total_expense: '125000', total_entries: '12',
    }] });
    await assistant(request({ question: 'aaj kitna kamaya?' }));
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("Asia/Kolkata"), ['user-a']);
    const providerBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(providerBody.instructions).toContain('Today: income ₹1250.50, expenses ₹200.50, net earnings ₹1050.00, entries 3.');
    expect(providerBody.instructions).toContain('All saved entries: income ₹5000.00');
  });
  it('extracts actual Responses API nested output', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ output: [{ content: [{ text: 'First' }, { text: 'Second' }] }] }));
    expect(await (await assistant(request({ question: 'help' }))).json()).toEqual({ answer: 'First\nSecond' });
  });
  it.each([401, 429, 500, 503])('handles provider HTTP %i without leaking details', async (status) => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: 'private token' }, { status }));
    const response = await assistant(request({ question: 'help' }));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('private');
  });
  it.each([{}, { output_text: '  ' }, { output: [] }])('handles empty provider response %j', async (body) => {
    vi.mocked(fetch).mockResolvedValue(Response.json(body));
    expect((await assistant(request({ question: 'help' }))).status).toBe(502);
  });
  it('handles network rejection', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    expect((await assistant(request({ question: 'help' }))).status).toBe(502);
  });
  it('handles invalid provider JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('<html>failure</html>'));
    expect((await assistant(request({ question: 'help' }))).status).toBe(502);
  });
});

describe('fixed defect regressions', () => {
  it('earnings rejects boolean amount instead of coercing it to money', async () => {
    expect((await save(request({ income: true }))).status).toBe(400);
  });
  it('earnings enforces the UI limit of one million rupees', async () => {
    expect((await save(request({ income: 1000001 }))).status).toBe(400);
  });
  it('earnings malformed JSON returns 400', async () => {
    expect((await save(invalidJSON())).status).toBe(400);
  });
  it('earnings database outage returns controlled 503', async () => {
    mocks.query.mockRejectedValue(new Error('database unavailable'));
    expect((await list()).status).toBe(503);
  });
  it.each([login, signup])('auth malformed JSON returns 400 without touching the database', async (handler) => {
    expect((await handler(invalidJSON())).status).toBe(400);
    expect(mocks.ensureSchema).not.toHaveBeenCalled();
  });
  it.each([null, [], 'text', { email: 42, password: 'secret123' }, { email: 'a@b.com', password: ['secret123'] }])('login rejects invalid body %j', async (body) => {
    expect((await login(request(body))).status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it.each([null, [], { email: ['a@b.com'], password: 'secret123' }, { email: 'a@b.com', password: 12345678 }])('signup rejects invalid body %j', async (body) => {
    expect((await signup(request(body))).status).toBe(400);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });
  it.each([null, [], 'help'])('AI rejects non-object body %j', async (body) => {
    expect((await assistant(request(body))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('concurrent duplicate signup maps unique violation to 409', async () => {
    mocks.query.mockResolvedValueOnce({ rowCount: 0 }).mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
    expect((await signup(request({ email: 'a@b.com', password: 'secret123' }))).status).toBe(409);
    expect(mocks.setSession).not.toHaveBeenCalled();
  });
});

describe('AI provider timeout', () => {
  const hangUntilAborted = (_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
  });

  it('attaches an abort signal to the provider request', async () => {
    await assistant(request({ question: 'help' }));
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it('returns 504 when the provider does not answer in time', async () => {
    vi.stubEnv('OPENAI_TIMEOUT_MS', '1000');
    vi.mocked(fetch).mockImplementation(hangUntilAborted);
    const started = Date.now();
    const response = await assistant(request({ question: 'help' }));
    expect(response.status).toBe(504);
    expect(Date.now() - started).toBeLessThan(3000);
    expect((await response.json()).error).toMatch(/took too long/);
  });
  it('ignores an out-of-range timeout setting and keeps the 20 second default', async () => {
    vi.stubEnv('OPENAI_TIMEOUT_MS', '999999');
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    await assistant(request({ question: 'help' }));
    expect(timeout).toHaveBeenCalledWith(20000);
    timeout.mockRestore();
  });
});
