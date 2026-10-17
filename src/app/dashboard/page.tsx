import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { HomeScreen } from "@/modules/home/presentation/home-screen";
import { getEarningsOverview } from "@/modules/earnings/application/earnings-service";
import { listComplaints } from "@/modules/complaints/application/complaint-service";
import { listDocuments } from "@/modules/documents/application/document-service";
import { getSessionUserId } from "@/shared/server/auth";
import { ensureSchema, query } from "@/shared/server/postgres";
import { logError } from "@/shared/server/guard";

export const metadata: Metadata = { title: "Dashboard | Gig Worker Companion" };
export const instant = false;

const emptyEarnings = { entries: [], totals: { income: 0, expense: 0, entries: 0 } };

/** Loads the account and every panel's first data in one parallel round trip, so the client starts with no fetch waterfall. */
export default async function DashboardPage() {
  await connection();
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  await ensureSchema();
  const fallback = <T,>(scope: string, value: T) => (error: unknown) => { logError(scope, error); return value; };
  const [{ rows }, earnings, complaints, documents] = await Promise.all([
    query<{ display_name: string | null; email: string }>("SELECT display_name, email FROM users WHERE id = $1", [userId]),
    getEarningsOverview(userId).catch(fallback("dashboard.earnings", emptyEarnings)),
    listComplaints(userId).catch(fallback("dashboard.complaints", [])),
    listDocuments(userId).catch(fallback("dashboard.documents", [])),
  ]);
  const account = rows[0];
  const fallbackName = account?.email.split("@")[0].split(/[._-]/)[0] || "Friend";
  const displayName = account?.display_name?.trim() || fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
  return <HomeScreen displayName={displayName} initial={{ earnings, complaints, documents }} />;
}
