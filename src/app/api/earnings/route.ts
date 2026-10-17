import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";
import { BodyTooLargeError, readBoundedJsonObject } from "@/shared/server/http";
import { EarningsValidationError } from "@/modules/earnings/domain/earnings";
import { getEarningsOverview, saveEarnings } from "@/modules/earnings/application/earnings-service";
import { guardMutation, logError } from "@/shared/server/guard";

const MAX_BODY_BYTES = 4_096;
const unavailable = () => NextResponse.json({ error: "Earnings service is temporarily unavailable." }, { status: 503 });

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    return NextResponse.json(await getEarningsOverview(userId));
  } catch (error) {
    logError("earnings.list", error);
    return unavailable();
  }
}

export async function POST(request: Request) {
  const blocked = guardMutation(request, "write");
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: Record<string, unknown> | null;
  try {
    body = await readBoundedJsonObject(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    throw error;
  }
  if (!body) return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  try {
    return NextResponse.json({ id: await saveEarnings(userId, body) }, { status: 201 });
  } catch (error) {
    if (error instanceof EarningsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logError("earnings.save", error);
    return unavailable();
  }
}
