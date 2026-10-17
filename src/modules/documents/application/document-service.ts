import { createHash } from "node:crypto";
import {
  detectDocumentKind,
  groundExplanation,
  normalizeDocumentText,
  sanitizeFileName,
  splitIntoPassages,
  type DocumentDetail,
  type DocumentSummary,
  type Language,
} from "@/modules/documents/domain/documents";
import { extractDocumentText } from "@/modules/documents/infrastructure/text-extractor";
import { requestExplanation } from "@/modules/documents/infrastructure/document-explainer";
import { findDocumentForUser, findDocumentsByUser, findExplanationByHash, insertDocument } from "@/modules/documents/infrastructure/document-repository";

export type UploadedFile = { name: string; type: string; bytes: Uint8Array };

/** Validates, extracts, explains with source checks, and saves a document for one user. */
export async function explainDocument(userId: string, file: UploadedFile, language: Language): Promise<DocumentDetail> {
  const kind = detectDocumentKind(file.name, file.type, file.bytes);
  const { text, truncated } = normalizeDocumentText(await extractDocumentText(kind, file.bytes));
  const passages = splitIntoPassages(text);
  const contentHash = createHash("sha256").update(text).digest("hex");
  const cached = await findExplanationByHash(userId, contentHash, language);
  const explanation = cached ?? groundExplanation(await requestExplanation(passages, language), passages);
  const saved = await insertDocument(userId, { fileName: sanitizeFileName(file.name), kind, byteSize: file.bytes.byteLength, text, contentHash, truncated, language, explanation });
  return { ...saved, passages, truncated, explanation };
}

export const listDocuments = (userId: string): Promise<DocumentSummary[]> => findDocumentsByUser(userId);

export async function getDocument(userId: string, id: string): Promise<DocumentDetail | null> {
  const stored = await findDocumentForUser(userId, id);
  if (!stored) return null;
  const { text, ...rest } = stored;
  return { ...rest, passages: splitIntoPassages(text) };
}
