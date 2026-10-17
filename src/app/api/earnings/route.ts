import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";
import { EarningsValidationError } from "@/modules/earnings/domain/earnings";
import { listEarnings, saveEarnings } from "@/modules/earnings/application/earnings-service";

const unavailable = () => NextResponse.json({ error: "Earnings service is temporarily unavailable." }, { status: 503 });

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    return NextResponse.json({ entries: await listEarnings(userId) });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  try {
    return NextResponse.json({ id: await saveEarnings(userId, body) }, { status: 201 });
  } catch (error) {
    if (error instanceof EarningsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return unavailable();
  }
}
