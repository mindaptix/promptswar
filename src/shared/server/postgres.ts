import "server-only";
import { Pool, type PoolConfig, type QueryResultRow } from "pg";

const globalForPostgres = globalThis as unknown as { postgresPool?: Pool; postgresSchema?: Promise<void> };

const parseBoundedInteger = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

/** Builds an explicit pool configuration so TLS and resource limits are reviewable. */
export function getPostgresPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  const parsedUrl = new URL(connectionString);
  const hostname = parsedUrl.hostname;
  const isLocal = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  const sslMode = (process.env.POSTGRES_SSL_MODE || parsedUrl.searchParams.get("sslmode") || (isLocal ? "disable" : "verify-full")).toLowerCase();
  if (!["disable", "require", "verify-full"].includes(sslMode)) {
    throw new Error("POSTGRES_SSL_MODE must be disable, require, or verify-full");
  }

  const ca = process.env.POSTGRES_CA_CERT?.replace(/\\n/g, "\n");
  const ssl = sslMode === "disable"
    ? false
    : { rejectUnauthorized: sslMode === "verify-full", ...(ca ? { ca } : {}) };

  // pg connection-string TLS parameters replace the explicit ssl object, so
  // normalize them into the reviewed configuration above.
  for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    parsedUrl.searchParams.delete(parameter);
  }

  return {
    connectionString: parsedUrl.toString(),
    ssl,
    max: parseBoundedInteger(process.env.POSTGRES_POOL_MAX, 10, 1, 50),
    connectionTimeoutMillis: parseBoundedInteger(process.env.POSTGRES_CONNECT_TIMEOUT_MS, 5_000, 500, 30_000),
    idleTimeoutMillis: parseBoundedInteger(process.env.POSTGRES_IDLE_TIMEOUT_MS, 10_000, 1_000, 120_000),
    query_timeout: parseBoundedInteger(process.env.POSTGRES_QUERY_TIMEOUT_MS, 10_000, 500, 60_000),
    statement_timeout: parseBoundedInteger(process.env.POSTGRES_STATEMENT_TIMEOUT_MS, 10_000, 500, 60_000),
  };
}

function getPool() {
  if (!globalForPostgres.postgresPool) {
    const pool = new Pool(getPostgresPoolConfig());
    // An idle client error without a listener is emitted as an uncaught exception and terminates the process.
    pool.on("error", (error) => console.error("PostgreSQL idle client error:", error.message));
    globalForPostgres.postgresPool = pool;
  }
  return globalForPostgres.postgresPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}

export async function ensureSchema() {
  if (!globalForPostgres.postgresSchema) {
    globalForPostgres.postgresSchema = query(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, display_name TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
      CREATE TABLE IF NOT EXISTS earnings (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, income INTEGER NOT NULL CHECK (income >= 0), expense INTEGER NOT NULL DEFAULT 0 CHECK (expense >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS earnings_user_created_idx ON earnings(user_id, created_at DESC);
    `).then(() => undefined).catch((error) => {
      globalForPostgres.postgresSchema = undefined;
      throw error;
    });
  }
  return globalForPostgres.postgresSchema;
}
