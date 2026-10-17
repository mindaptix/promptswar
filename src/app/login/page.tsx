import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/modules/auth/presentation/login-screen";
import { getSessionUserId } from "@/shared/server/auth";

export const metadata: Metadata = { title: "Sign in | Gig Worker Companion" };
export const instant = false;

export default async function LoginPage() {
  await connection();
  if (await getSessionUserId()) redirect("/dashboard");
  return <LoginScreen />;
}
