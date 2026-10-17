import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { HomeScreen } from "@/modules/home/presentation/home-screen";
import { getSessionUserId } from "@/shared/server/auth";
import { ensureSchema, query } from "@/shared/server/postgres";

export const metadata: Metadata = { title: "Dashboard | Gig Worker Companion" };
export const instant = false;

export default async function DashboardPage() {
  await connection();
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  await ensureSchema();
  const { rows } = await query<{ display_name: string | null; email: string }>(
    "SELECT display_name, email FROM users WHERE id = $1",
    [userId],
  );
  const account = rows[0];
  const fallbackName = account?.email.split("@")[0].split(/[._-]/)[0] || "Friend";
  const displayName = account?.display_name?.trim() || fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
  return <HomeScreen displayName={displayName} />;
}
