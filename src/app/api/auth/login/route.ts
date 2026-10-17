import { NextResponse } from "next/server";
import { ensureSchema, query } from "@/shared/server/postgres";
import { setSession, verifyPassword } from "@/shared/server/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    await ensureSchema();
    const { rows } = await query<{ id: string; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = $1", [String(email || "").trim().toLowerCase()]);
    const user = rows[0];
    if (!user || !(await verifyPassword(String(password || ""), user.password_hash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    await setSession(user.id);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 }); }
}
