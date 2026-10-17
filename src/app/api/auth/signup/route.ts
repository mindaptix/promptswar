import { NextResponse } from "next/server";
import { ensureSchema, query } from "@/shared/server/postgres";
import { randomUUID } from "node:crypto";
import { hashPassword, setSession } from "@/shared/server/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || String(password || "").length < 8) return NextResponse.json({ error: "Use a valid email and a password with at least 8 characters." }, { status: 400 });
    await ensureSchema();
    if ((await query("SELECT 1 FROM users WHERE email = $1", [normalizedEmail])).rowCount) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    const id = randomUUID();
    await query("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", [id, normalizedEmail, await hashPassword(password)]);
    await setSession(id);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to create the account right now." }, { status: 500 }); }
}
