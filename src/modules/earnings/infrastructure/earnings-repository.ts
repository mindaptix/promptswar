import "server-only";
import { randomUUID } from "node:crypto";
import { ensureSchema, query } from "@/shared/server/postgres";
import type { EarningsEntry, EarningsInput } from "@/modules/earnings/domain/earnings";

type EarningsRow = { id: string; income: number; expense: number; expense_note: string; entry_date: Date | string; time: Date | string };
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
  recentExpenses: ReadonlyArray<{ amount: number; note: string; date: string }>;
}>;

export async function findEarningsByUser(userId: string): Promise<EarningsEntry[]> {
  await ensureSchema();
  const { rows } = await query<EarningsRow>(
    "SELECT id, income, expense, expense_note, entry_date, created_at AS time FROM earnings WHERE user_id = $1 ORDER BY entry_date DESC, created_at DESC LIMIT 100",
    [userId],
  );
  return rows.map((row) => ({ id: row.id, income: row.income, expense: row.expense, expenseNote: row.expense_note, date: row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : String(row.entry_date).slice(0, 10), time: row.time instanceof Date ? row.time.toISOString() : row.time }));
}

export async function insertEarnings(userId: string, amounts: EarningsInput): Promise<string> {
  await ensureSchema();
  const id = randomUUID();
  await query(
    "INSERT INTO earnings (id, user_id, income, expense, expense_note, entry_date) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, userId, amounts.income, amounts.expense, amounts.expenseNote, amounts.date],
  );
  return id;
}

export async function summarizeEarningsByUser(userId: string): Promise<EarningsSummary> {
  await ensureSchema();
  const [{ rows }, expenseRows] = await Promise.all([query<EarningsSummaryRow>(
    `SELECT
      COALESCE(SUM(income) FILTER (WHERE entry_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date), 0)::text AS today_income,
      COALESCE(SUM(expense) FILTER (WHERE entry_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date), 0)::text AS today_expense,
      COUNT(*) FILTER (WHERE entry_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date)::text AS today_entries,
      COALESCE(SUM(income), 0)::text AS total_income,
      COALESCE(SUM(expense), 0)::text AS total_expense,
      COUNT(*)::text AS total_entries
    FROM earnings WHERE user_id = $1`,
    [userId],
  ), query<{ expense: number; expense_note: string; entry_date: Date | string }>(
    "SELECT expense, expense_note, entry_date FROM earnings WHERE user_id = $1 AND expense > 0 ORDER BY entry_date DESC, created_at DESC LIMIT 20",
    [userId],
  )]);
  const row = rows[0];
  return {
    todayIncome: Number(row?.today_income ?? 0),
    todayExpense: Number(row?.today_expense ?? 0),
    todayEntries: Number(row?.today_entries ?? 0),
    totalIncome: Number(row?.total_income ?? 0),
    totalExpense: Number(row?.total_expense ?? 0),
    totalEntries: Number(row?.total_entries ?? 0),
    recentExpenses: expenseRows.rows.map((expense) => ({ amount: expense.expense, note: expense.expense_note || "Other expense", date: expense.entry_date instanceof Date ? expense.entry_date.toISOString().slice(0, 10) : String(expense.entry_date).slice(0, 10) })),
  };
}
