import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";
import { getDocument } from "@/modules/documents/application/document-service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const notFound = () => NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (!UUID.test(id)) return notFound();
  try {
    const document = await getDocument(userId, id);
    return document ? NextResponse.json({ document }) : notFound();
  } catch {
    return NextResponse.json({ error: "Documents are temporarily unavailable." }, { status: 503 });
  }
}
