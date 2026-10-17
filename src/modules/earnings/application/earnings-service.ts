import type { EarningsEntry } from "@/modules/earnings/domain/earnings";
import { parseEarningsInput } from "@/modules/earnings/domain/earnings";
import { findEarningsByUser, insertEarnings, summarizeEarningsByUser } from "@/modules/earnings/infrastructure/earnings-repository";

export const listEarnings = (userId: string): Promise<EarningsEntry[]> => findEarningsByUser(userId);
export const getEarningsSummary = (userId: string) => summarizeEarningsByUser(userId);

export type EarningsTotals = { income: number; expense: number; entries: number };

/** Recent entries plus all-time totals computed in SQL, so totals stay right beyond the listed page. */
export async function getEarningsOverview(userId: string): Promise<{ entries: EarningsEntry[]; totals: EarningsTotals }> {
  const [entries, summary] = await Promise.all([findEarningsByUser(userId), summarizeEarningsByUser(userId)]);
  return { entries, totals: { income: summary.totalIncome, expense: summary.totalExpense, entries: summary.totalEntries } };
}

export async function saveEarnings(userId: string, body: unknown): Promise<string> {
  return insertEarnings(userId, parseEarningsInput(body));
}
