import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";
import { getComplaint, updateComplaint } from "@/modules/complaints/application/complaint-service";
import { complaintErrorResponse, notFound, readComplaintBody, signInRequired, UUID } from "../responses";
import { guardMutation } from "@/shared/server/guard";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const userId = await getSessionUserId();
  if (!userId) return signInRequired();
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  try {
    const complaint = await getComplaint(userId, id);
    return complaint ? NextResponse.json({ complaint }) : notFound();
  } catch (error) {
    return complaintErrorResponse(error, "Complaints are temporarily unavailable.");
  }
}

export async function PUT(request: Request, { params }: Context) {
  const blocked = guardMutation(request, "write");
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return signInRequired();
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  const body = await readComplaintBody(request);
  if (body instanceof NextResponse) return body;
  try {
    const complaint = await updateComplaint(userId, id, body.draft);
    return complaint ? NextResponse.json({ complaint }) : notFound();
  } catch (error) {
    return complaintErrorResponse(error, "The complaint could not be saved right now.");
  }
}
