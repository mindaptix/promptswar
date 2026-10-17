import type { EarningsEntry } from "@/modules/earnings/domain/earnings";
import { parseEarningsInput } from "@/modules/earnings/domain/earnings";
import { findEarningsByUser, insertEarnings } from "@/modules/earnings/infrastructure/earnings-repository";

export const listEarnings = (userId: string): Promise<EarningsEntry[]> => findEarningsByUser(userId);

export async function saveEarnings(userId: string, body: unknown): Promise<string> {
  return insertEarnings(userId, parseEarningsInput(body));
}
