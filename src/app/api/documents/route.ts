import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";
import { BodyTooLargeError, readBoundedFormData } from "@/shared/server/http";
import { isOpenAIConfigured, OpenAIError } from "@/shared/server/openai";
import { DocumentError, MAX_UPLOAD_BYTES, type DocumentErrorCode } from "@/modules/documents/domain/documents";
import { explainDocument, listDocuments } from "@/modules/documents/application/document-service";
import { guardMutation, logError } from "@/shared/server/guard";

const MULTIPART_OVERHEAD_BYTES = 16 * 1024;

const statusFor: Record<DocumentErrorCode, number> = {
  missing_file: 400,
  too_large: 413,
  empty_file: 400,
  unsupported_type: 415,
  type_mismatch: 415,
  invalid_text: 415,
  unreadable: 422,
  too_many_pages: 422,
  no_text: 422,
  ungrounded: 502,
};

const aiFailures = {
  not_configured: ["AI service is not configured yet.", 503],
  timeout: ["The AI service took too long to explain this document. Please try again.", 504],
  upstream: ["The AI service could not explain this document right now.", 502],
  empty: ["The AI returned an empty explanation.", 502],
} as const;

const documentError = (code: DocumentErrorCode) => {
  const error = new DocumentError(code);
  return NextResponse.json({ error: error.message, code }, { status: statusFor[code] });
};

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    return NextResponse.json({ documents: await listDocuments(userId) });
  } catch (error) {
    logError("documents.list", error);
    return NextResponse.json({ error: "Documents are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const blocked = guardMutation(request, "write");
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isOpenAIConfigured()) return NextResponse.json({ error: aiFailures.not_configured[0], code: "not_configured" }, { status: 503 });

  let form: FormData | null;
  try {
    form = await readBoundedFormData(request, MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return documentError("too_large");
    return NextResponse.json({ error: "The upload could not be read." }, { status: 400 });
  }
  const file = form?.get("file");
  if (!(file instanceof File)) return documentError("missing_file");
  const language = form?.get("language") === "hi" ? "hi" : "en";

  try {
    const document = await explainDocument(userId, { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) }, language);
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentError) return documentError(error.code);
    if (error instanceof OpenAIError) {
      const [message, status] = aiFailures[error.reason];
      return NextResponse.json({ error: message, code: error.reason }, { status });
    }
    logError("documents.save", error);
    return NextResponse.json({ error: "The document could not be saved right now." }, { status: 503 });
  }
}
