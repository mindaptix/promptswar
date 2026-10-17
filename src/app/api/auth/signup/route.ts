import { NextResponse } from "next/server";
import { getDatabase } from "@/shared/server/mongodb";
import { hashPassword, setSession } from "@/shared/server/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || String(password || "").length < 8) return NextResponse.json({ error: "Use a valid email and a password with at least 8 characters." }, { status: 400 });
    const db = await getDatabase();
    const users = db.collection("users");
    if (await users.findOne({ email: normalizedEmail })) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    const result = await users.insertOne({ email: normalizedEmail, passwordHash: await hashPassword(password), createdAt: new Date() });
    await setSession(result.insertedId.toString());
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to create the account right now." }, { status: 500 }); }
}
