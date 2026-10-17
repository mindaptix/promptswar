import { NextResponse } from "next/server";
import { getDatabase } from "@/shared/server/mongodb";
import { setSession, verifyPassword } from "@/shared/server/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const user = await (await getDatabase()).collection("users").findOne({ email: String(email || "").trim().toLowerCase() });
    if (!user || !(await verifyPassword(String(password || ""), String(user.passwordHash)))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    await setSession(user._id.toString());
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 }); }
}
