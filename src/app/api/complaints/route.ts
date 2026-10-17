import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";
import { listComplaints, saveComplaint } from "@/modules/complaints/application/complaint-service";
import { complaintErrorResponse, readComplaintBody, signInRequired } from "./responses";
import { guardMutation, logError } from "@/shared/server/guard";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return signInRequired();
  try {
    return NextResponse.json({ complaints: await listComplaints(userId) });
  } catch (error) {
    logError("complaints.list", error);
    return complaintErrorResponse(error, "Complaints are temporarily unavailable.");
  }
}

export async function POST(request: Request) {
  const blocked = guardMutation(request, "write");
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return signInRequired();
  const body = await readComplaintBody(request);
  if (body instanceof NextResponse) return body;
  try {
    const complaint = await saveComplaint(userId, body.facts, body.draft, body.language === "hi" ? "hi" : "en");
    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    logError("complaints.save", error);
    return complaintErrorResponse(error, "The complaint could not be saved right now.");
  }
}
