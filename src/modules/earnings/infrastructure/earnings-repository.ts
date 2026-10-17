import "server-only";
import { randomUUID } from "node:crypto";
import { ensureSchema, query } from "@/shared/server/postgres";
import type { EarningsEntry, EarningsInput } from "@/modules/earnings/domain/earnings";

type EarningsRow = { id: string; income: number; expense: number; time: Date | string };

export async function findEarningsByUser(userId: string): Promise<EarningsEntry[]> {
  await ensureSchema();
  const { rows } = await query<EarningsRow>(
    "SELECT id, income, expense, created_at AS time FROM earnings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
    [userId],
  );
  return rows.map((row) => ({ ...row, time: row.time instanceof Date ? row.time.toISOString() : row.time }));
}

export async function insertEarnings(userId: string, amounts: EarningsInput): Promise<string> {
  await ensureSchema();
  const id = randomUUID();
  await query(
    "INSERT INTO earnings (id, user_id, income, expense) VALUES ($1, $2, $3, $4)",
    [id, userId, amounts.income, amounts.expense],
  );
  return id;
}
