import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { HomeScreen } from "@/modules/home/presentation/home-screen";
import { getSessionUserId } from "@/shared/server/auth";

export const metadata: Metadata = { title: "Dashboard | Gig Worker Companion" };
export const instant = false;

export default async function DashboardPage() {
  await connection();
  if (!(await getSessionUserId())) redirect("/login");
  return <HomeScreen />;
}
