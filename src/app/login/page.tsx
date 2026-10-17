import type { Metadata } from "next";
import { LoginScreen } from "@/modules/auth/presentation/login-screen";

export const metadata: Metadata = { title: "Sign in | Gig Worker Companion" };

export default function LoginPage() {
  return <LoginScreen />;
}
