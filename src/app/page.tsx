import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/shared/server/auth";

export const instant = false;

export default async function Home() {
  await connection();
  redirect((await getSessionUserId()) ? "/dashboard" : "/login");
}
