import { NextResponse } from "next/server";
import { ensureSchema, query } from "@/shared/server/postgres";
import { setSession, verifyPassword } from "@/shared/server/auth";
import { readJsonObject } from "@/shared/server/http";
import { guardMutation, logError } from "@/shared/server/guard";

export async function POST(request: Request) {
  const blocked = guardMutation(request, "auth");
  if (blocked) return blocked;
  const body = await readJsonObject(request);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  try {
    await ensureSchema();
    const { rows } = await query<{ id: string; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = $1", [body.email.trim().toLowerCase()]);
    const user = rows[0];
    if (!user || !(await verifyPassword(body.password, user.password_hash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    await setSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("auth.login", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
