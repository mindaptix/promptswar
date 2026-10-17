import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ query: vi.fn(), created: vi.fn(), on: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('pg', () => ({ Pool: class { query = db.query; on = db.on; constructor(options: unknown) { db.created(options); } } }));
const shared = globalThis as unknown as { postgresPool?: unknown; postgresSchema?: Promise<void> };
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  delete shared.postgresPool; delete shared.postgresSchema;
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost/test');
  vi.stubEnv('NODE_ENV', 'development');
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
});
afterEach(() => { delete shared.postgresPool; delete shared.postgresSchema; vi.unstubAllEnvs(); });
describe('PostgreSQL adapter', () => {
  it('uses parameterized query values unchanged', async () => {
    const { query } = await import('@/shared/server/postgres');
    await query('SELECT $1', ["a'; DROP TABLE users;--"]);
    expect(db.query).toHaveBeenCalledWith('SELECT $1', ["a'; DROP TABLE users;--"]);
  });
  it('reuses development pool', async () => {
    const { query } = await import('@/shared/server/postgres');
    await query('SELECT 1'); await query('SELECT 2');
    expect(db.created).toHaveBeenCalledTimes(1);
  });
  it('coalesces concurrent schema initialization', async () => {
    const { ensureSchema } = await import('@/shared/server/postgres');
    await Promise.all([ensureSchema(), ensureSchema(), ensureSchema()]);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('earnings_user_created_idx');
  });
  it('fails clearly without database configuration', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const { query } = await import('@/shared/server/postgres');
    await expect(query('SELECT 1')).rejects.toThrow('DATABASE_URL is not configured');
    expect(db.created).not.toHaveBeenCalled();
  });
  it('reuses the same pool in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { query } = await import('@/shared/server/postgres');
    await query('SELECT 1'); await query('SELECT 2');
    expect(db.created).toHaveBeenCalledTimes(1);
  });
  it('retries schema initialization after a transient failure', async () => {
    db.query.mockRejectedValueOnce(new Error('temporary outage')).mockResolvedValue({ rows: [] });
    const { ensureSchema } = await import('@/shared/server/postgres');
    await expect(ensureSchema()).rejects.toThrow('temporary outage');
    await expect(ensureSchema()).resolves.toBeUndefined();
  });
  it('uses verified TLS by default for a remote database', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@db.example.com/app');
    const { getPostgresPoolConfig } = await import('@/shared/server/postgres');
    expect(getPostgresPoolConfig().ssl).toEqual({ rejectUnauthorized: true });
  });
  it('disables TLS for a local database by default', async () => {
    const { getPostgresPoolConfig } = await import('@/shared/server/postgres');
    expect(getPostgresPoolConfig().ssl).toBe(false);
  });
  it('allows encrypted provider TLS without CA verification only when explicitly requested', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@db.example.com/app?sslmode=require');
    const { getPostgresPoolConfig } = await import('@/shared/server/postgres');
    const config = getPostgresPoolConfig();
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(config.connectionString).not.toContain('sslmode');
  });
  it('handles idle client errors instead of crashing the process', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { query } = await import('@/shared/server/postgres');
    await query('SELECT 1');
    const [event, handler] = db.on.mock.calls[0];
    expect(event).toBe('error');
    handler(new Error('terminating connection due to administrator command'));
    expect(log).toHaveBeenCalledWith('PostgreSQL idle client error:', 'terminating connection due to administrator command');
  });
  it('applies bounded pool and query timeouts', async () => {
    vi.stubEnv('POSTGRES_POOL_MAX', '500');
    vi.stubEnv('POSTGRES_QUERY_TIMEOUT_MS', '2500');
    const { getPostgresPoolConfig } = await import('@/shared/server/postgres');
    expect(getPostgresPoolConfig()).toMatchObject({ max: 10, query_timeout: 2500, statement_timeout: 10000, connectionTimeoutMillis: 5000 });
  });
});
