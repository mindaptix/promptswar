import { NextResponse } from "next/server";
import { BodyTooLargeError, readBoundedJsonObject } from "@/shared/server/http";
import { OpenAIError } from "@/shared/server/openai";
import { ComplaintValidationError } from "@/modules/complaints/domain/complaints";
import { InvalidAiDraftError } from "@/modules/complaints/application/complaint-service";

export const MAX_COMPLAINT_BODY_BYTES = 32 * 1024;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const signInRequired = () => NextResponse.json({ error: "Sign in required." }, { status: 401 });
export const notFound = () => NextResponse.json({ error: "Complaint not found." }, { status: 404 });

/** Reads a bounded JSON object body, or returns the error response to send. */
export async function readComplaintBody(request: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const body = await readBoundedJsonObject(request, MAX_COMPLAINT_BODY_BYTES);
    return body ?? NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  } catch (error) {
    if (error instanceof BodyTooLargeError) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}

const aiFailures = {
  not_configured: ["AI service is not configured yet. You can start from the template instead.", 503],
  timeout: ["The AI service took too long. Try again or start from the template.", 504],
  upstream: ["The AI service could not write a draft right now. Try again or start from the template.", 502],
  empty: ["The AI returned an empty draft. Try again or start from the template.", 502],
} as const;

export function complaintErrorResponse(error: unknown, unavailableMessage: string) {
  if (error instanceof ComplaintValidationError) return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 });
  if (error instanceof InvalidAiDraftError) return NextResponse.json({ error: aiFailures.upstream[0], code: "upstream" }, { status: 502 });
  if (error instanceof OpenAIError) {
    const [message, status] = aiFailures[error.reason];
    return NextResponse.json({ error: message, code: error.reason }, { status });
  }
  return NextResponse.json({ error: unavailableMessage }, { status: 503 });
}
