import "server-only";
import { randomUUID } from "node:crypto";
import { ensureSchema, query } from "@/shared/server/postgres";
import type { ComplaintDraft, ComplaintFacts, ComplaintRecord, ComplaintSummary, Language } from "@/modules/complaints/domain/complaints";

type SummaryRow = { id: string; category: ComplaintSummary["category"]; subject: string; updated_at: Date | string };
type RecordRow = SummaryRow & { language: Language; facts: ComplaintFacts | string; draft: ComplaintDraft | string; created_at: Date | string };

const iso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);
const json = <T>(value: T | string): T => (typeof value === "string" ? (JSON.parse(value) as T) : value);
const toSummary = (row: SummaryRow): ComplaintSummary => ({ id: row.id, category: row.category, subject: row.subject, updatedAt: iso(row.updated_at) });
const toRecord = (row: RecordRow): ComplaintRecord => ({ ...toSummary(row), language: row.language, facts: json(row.facts), draft: json(row.draft), createdAt: iso(row.created_at) });
const RECORD_COLUMNS = "id, category, subject, language, facts, draft, created_at, updated_at";

export async function insertComplaint(userId: string, facts: ComplaintFacts, draft: ComplaintDraft, language: Language): Promise<ComplaintRecord> {
  await ensureSchema();
  const { rows } = await query<RecordRow>(
    `INSERT INTO complaints (id, user_id, category, subject, language, facts, draft) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${RECORD_COLUMNS}`,
    [randomUUID(), userId, facts.category, draft.subject, language, JSON.stringify(facts), JSON.stringify(draft)],
  );
  return toRecord(rows[0]);
}

export async function updateComplaintDraft(userId: string, id: string, draft: ComplaintDraft): Promise<ComplaintRecord | null> {
  await ensureSchema();
  const { rows } = await query<RecordRow>(
    `UPDATE complaints SET draft = $3, subject = $4, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING ${RECORD_COLUMNS}`,
    [id, userId, JSON.stringify(draft), draft.subject],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function findComplaintsByUser(userId: string): Promise<ComplaintSummary[]> {
  await ensureSchema();
  const { rows } = await query<SummaryRow>("SELECT id, category, subject, updated_at FROM complaints WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50", [userId]);
  return rows.map(toSummary);
}

export async function findComplaintForUser(userId: string, id: string): Promise<ComplaintRecord | null> {
  await ensureSchema();
  const { rows } = await query<RecordRow>(`SELECT ${RECORD_COLUMNS} FROM complaints WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] ? toRecord(rows[0]) : null;
}
