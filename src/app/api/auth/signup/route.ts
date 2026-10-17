import { NextResponse } from "next/server";
import { ensureSchema, isUniqueViolation, query } from "@/shared/server/postgres";
import { randomUUID } from "node:crypto";
import { hashPassword, setSession } from "@/shared/server/auth";
import { readJsonObject } from "@/shared/server/http";
import { guardMutation, logError } from "@/shared/server/guard";

const duplicate = () => NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

export async function POST(request: Request) {
  const blocked = guardMutation(request, "auth");
  if (blocked) return blocked;
  const body = await readJsonObject(request);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return NextResponse.json({ error: "Use a valid email and a password with at least 8 characters." }, { status: 400 });
  try {
    await ensureSchema();
    if ((await query("SELECT 1 FROM users WHERE email = $1", [email])).rowCount) return duplicate();
    const id = randomUUID();
    await query("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", [id, email, await hashPassword(password)]);
    await setSession(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isUniqueViolation(error)) return duplicate();
    logError("auth.signup", error);
    return NextResponse.json({ error: "Unable to create the account right now." }, { status: 500 });
  }
}
