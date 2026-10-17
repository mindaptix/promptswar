import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";
import { draftComplaint } from "@/modules/complaints/application/complaint-service";
import { complaintErrorResponse, readComplaintBody, signInRequired } from "../responses";
import { guardMutation, logError } from "@/shared/server/guard";

export async function POST(request: Request) {
  const blocked = guardMutation(request, "ai");
  if (blocked) return blocked;
  if (!(await getSessionUserId())) return signInRequired();
  const body = await readComplaintBody(request);
  if (body instanceof NextResponse) return body;
  const mode = body.mode === "template" ? "template" : "ai";
  const language = body.language === "hi" ? "hi" : "en";
  try {
    return NextResponse.json(await draftComplaint(body.facts, language, mode));
  } catch (error) {
    logError("complaints.draft", error);
    return complaintErrorResponse(error, "The draft could not be created right now.");
  }
}
