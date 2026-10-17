import "server-only";
import { randomUUID } from "node:crypto";
import { ensureSchema, query } from "@/shared/server/postgres";
import type { DocumentKind, DocumentSummary, Explanation, Language } from "@/modules/documents/domain/documents";

export type StoredDocument = DocumentSummary & { text: string; truncated: boolean; explanation: Explanation };
type NewDocument = { fileName: string; kind: DocumentKind; byteSize: number; text: string; contentHash: string; truncated: boolean; language: Language; explanation: Explanation };
type Row = { id: string; file_name: string; kind: DocumentKind; created_at: Date | string };

const iso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);
const toSummary = (row: Row): DocumentSummary => ({ id: row.id, fileName: row.file_name, kind: row.kind, createdAt: iso(row.created_at) });

export async function insertDocument(userId: string, document: NewDocument): Promise<DocumentSummary> {
  await ensureSchema();
  const { rows } = await query<Row>(
    "INSERT INTO documents (id, user_id, file_name, kind, byte_size, text, content_hash, truncated, language, explanation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, file_name, kind, created_at",
    [randomUUID(), userId, document.fileName, document.kind, document.byteSize, document.text, document.contentHash, document.truncated, document.language, JSON.stringify(document.explanation)],
  );
  return toSummary(rows[0]);
}

/** Returns this user's earlier explanation of identical text in the same language, if any. */
export async function findExplanationByHash(userId: string, contentHash: string, language: Language): Promise<Explanation | null> {
  await ensureSchema();
  const { rows } = await query<{ explanation: Explanation | string }>(
    "SELECT explanation FROM documents WHERE user_id = $1 AND content_hash = $2 AND language = $3 ORDER BY created_at DESC LIMIT 1",
    [userId, contentHash, language],
  );
  const stored = rows[0]?.explanation;
  if (!stored) return null;
  return typeof stored === "string" ? (JSON.parse(stored) as Explanation) : stored;
}

export async function findDocumentsByUser(userId: string): Promise<DocumentSummary[]> {
  await ensureSchema();
  const { rows } = await query<Row>("SELECT id, file_name, kind, created_at FROM documents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId]);
  return rows.map(toSummary);
}

export async function findDocumentForUser(userId: string, id: string): Promise<StoredDocument | null> {
  await ensureSchema();
  const { rows } = await query<Row & { text: string; truncated: boolean; explanation: Explanation | string }>(
    "SELECT id, file_name, kind, created_at, text, truncated, explanation FROM documents WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  const row = rows[0];
  if (!row) return null;
  const explanation = typeof row.explanation === "string" ? (JSON.parse(row.explanation) as Explanation) : row.explanation;
  return { ...toSummary(row), text: row.text, truncated: row.truncated, explanation };
}
