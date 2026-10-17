import "server-only";
import { randomUUID } from "node:crypto";
import { ensureSchema, query } from "@/shared/server/postgres";
import type { EarningsEntry, EarningsInput } from "@/modules/earnings/domain/earnings";

type EarningsRow = { id: string; income: number; expense: number; time: Date | string };
type EarningsSummaryRow = {
  today_income: string;
  today_expense: string;
  today_entries: string;
  total_income: string;
  total_expense: string;
  total_entries: string;
};

export type EarningsSummary = Readonly<{
  todayIncome: number;
  todayExpense: number;
  todayEntries: number;
  totalIncome: number;
  totalExpense: number;
  totalEntries: number;
}>;

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

export async function summarizeEarningsByUser(userId: string): Promise<EarningsSummary> {
  await ensureSchema();
  const { rows } = await query<EarningsSummaryRow>(
    `SELECT
      COALESCE(SUM(income) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date), 0)::text AS today_income,
      COALESCE(SUM(expense) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date), 0)::text AS today_expense,
      COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date)::text AS today_entries,
      COALESCE(SUM(income), 0)::text AS total_income,
      COALESCE(SUM(expense), 0)::text AS total_expense,
      COUNT(*)::text AS total_entries
    FROM earnings WHERE user_id = $1`,
    [userId],
  );
  const row = rows[0];
  return {
    todayIncome: Number(row?.today_income ?? 0),
    todayExpense: Number(row?.today_expense ?? 0),
    todayEntries: Number(row?.today_entries ?? 0),
    totalIncome: Number(row?.total_income ?? 0),
    totalExpense: Number(row?.total_expense ?? 0),
    totalEntries: Number(row?.total_entries ?? 0),
  };
}
