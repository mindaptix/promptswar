import "server-only";
import { Pool, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

const globalForPostgres = globalThis as unknown as { postgresPool?: Pool; postgresSchema?: Promise<void> };
const pool = globalForPostgres.postgresPool ?? new Pool({ connectionString, max: 10, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined });
if (process.env.NODE_ENV !== "production") globalForPostgres.postgresPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return pool.query<T>(text, values);
}

export async function ensureSchema() {
  if (!globalForPostgres.postgresSchema) globalForPostgres.postgresSchema = query(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS earnings (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, income INTEGER NOT NULL, expense INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS earnings_user_created_idx ON earnings(user_id, created_at DESC);
  `).then(() => undefined);
  return globalForPostgres.postgresSchema;
}
