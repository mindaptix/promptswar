import "server-only";
import { decodeUtf8Text, DocumentError, MAX_PDF_PAGES, type DocumentKind } from "@/modules/documents/domain/documents";

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch {
    throw new DocumentError("unreadable");
  }
  try {
    if (pdf.numPages > MAX_PDF_PAGES) throw new DocumentError("too_many_pages");
    const { text } = await extractText(pdf, { mergePages: false });
    return text.join("\n\n");
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError("unreadable");
  } finally {
    await pdf.cleanup().catch(() => undefined);
  }
}

export function extractDocumentText(kind: DocumentKind, bytes: Uint8Array): Promise<string> {
  return kind === "pdf" ? extractPdfText(bytes) : Promise.resolve(decodeUtf8Text(bytes));
}
