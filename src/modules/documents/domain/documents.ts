export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_PDF_PAGES = 30;
export const MAX_DOCUMENT_CHARS = 30_000;
export const MAX_PASSAGE_CHARS = 700;
export const MAX_FILE_NAME_CHARS = 200;

export type DocumentKind = "pdf" | "text";
export type Language = "en" | "hi";
export type Passage = Readonly<{ id: string; text: string }>;
export type GroundedPoint = Readonly<{ text: string; sources: string[]; quote: string }>;
export type Explanation = Readonly<{ summary: string; summarySources: string[]; points: GroundedPoint[]; notInDocument: string[]; droppedPoints: number }>;
export type DocumentSummary = Readonly<{ id: string; fileName: string; kind: DocumentKind; createdAt: string }>;
export type DocumentDetail = DocumentSummary & Readonly<{ passages: Passage[]; truncated: boolean; explanation: Explanation }>;

export type DocumentErrorCode =
  | "missing_file"
  | "too_large"
  | "empty_file"
  | "unsupported_type"
  | "type_mismatch"
  | "invalid_text"
  | "unreadable"
  | "too_many_pages"
  | "no_text"
  | "ungrounded";

const messages: Record<DocumentErrorCode, string> = {
  missing_file: "Choose a file to upload.",
  too_large: "The file is larger than 2 MB.",
  empty_file: "The file is empty.",
  unsupported_type: "Only PDF and plain text (.txt) files are supported.",
  type_mismatch: "The file contents do not match its type.",
  invalid_text: "The text file is not valid UTF-8 text.",
  unreadable: "The PDF could not be read. It may be damaged or password-protected.",
  too_many_pages: `PDFs can have at most ${MAX_PDF_PAGES} pages.`,
  no_text: "No readable text was found. Scanned or photographed documents are not supported yet.",
  ungrounded: "The explanation could not be matched to the document text. Please try again.",
};

export class DocumentError extends Error {
  constructor(readonly code: DocumentErrorCode) {
    super(messages[code]);
    this.name = "DocumentError";
  }
}

const extensionOf = (fileName: string) => fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
const genericMimeTypes = new Set(["", "application/octet-stream"]);

/** Accepts a file only when its extension, declared MIME type, and leading bytes agree. */
export function detectDocumentKind(fileName: string, mimeType: string, bytes: Uint8Array): DocumentKind {
  if (bytes.byteLength === 0) throw new DocumentError("empty_file");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new DocumentError("too_large");
  const extension = extensionOf(fileName);
  const mime = mimeType.toLowerCase().split(";")[0].trim();

  if (extension === "pdf") {
    if (!genericMimeTypes.has(mime) && mime !== "application/pdf") throw new DocumentError("type_mismatch");
    if (new TextDecoder("latin1").decode(bytes.subarray(0, 5)) !== "%PDF-") throw new DocumentError("type_mismatch");
    return "pdf";
  }
  if (extension === "txt") {
    if (!genericMimeTypes.has(mime) && mime !== "text/plain") throw new DocumentError("type_mismatch");
    return "text";
  }
  throw new DocumentError("unsupported_type");
}

export function decodeUtf8Text(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new DocumentError("invalid_text");
  }
  if (text.includes("\u0000")) throw new DocumentError("invalid_text");
  return text;
}

export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "document").slice(0, MAX_FILE_NAME_CHARS);
}

export function normalizeDocumentText(text: string): { text: string; truncated: boolean } {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalized) throw new DocumentError("no_text");
  if (normalized.length <= MAX_DOCUMENT_CHARS) return { text: normalized, truncated: false };
  return { text: normalized.slice(0, MAX_DOCUMENT_CHARS).trimEnd(), truncated: true };
}

function splitLong(block: string): string[] {
  if (block.length <= MAX_PASSAGE_CHARS) return [block];
  const pieces: string[] = [];
  let current = "";
  for (const sentence of block.split(/(?<=[.!?।])\s+|\n/)) {
    for (let start = 0; start < sentence.length; start += MAX_PASSAGE_CHARS) {
      const part = sentence.slice(start, start + MAX_PASSAGE_CHARS);
      if (current && current.length + part.length + 1 > MAX_PASSAGE_CHARS) {
        pieces.push(current);
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/** Splits normalized text into numbered passages (P1, P2, ...) that explanations must cite. */
export function splitIntoPassages(text: string): Passage[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap(splitLong)
    .map((passage, index) => ({ id: `P${index + 1}`, text: passage }));
}

const comparable = (value: string) => value.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/**
 * Keeps only claims whose cited passages exist and whose quote appears verbatim
 * in one of them, so every shown point can be checked against the original text.
 */
export function groundExplanation(raw: unknown, passages: Passage[]): Explanation {
  const byId = new Map(passages.map((passage) => [passage.id, comparable(passage.text)]));
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const validIds = (value: unknown) =>
    Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && byId.has(id)))] : [];

  const candidates = Array.isArray(data.points) ? data.points : [];
  const points: GroundedPoint[] = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const { text, quote, sources } = candidate as Record<string, unknown>;
    if (!isNonEmptyString(text) || !isNonEmptyString(quote)) continue;
    const cited = validIds(sources);
    const needle = comparable(quote);
    if (cited.length && needle.length >= 3 && cited.some((id) => byId.get(id)!.includes(needle))) {
      points.push({ text: text.trim(), quote: quote.trim(), sources: cited });
    }
  }

  const summarySources = validIds(data.summarySources);
  if (!points.length || !isNonEmptyString(data.summary) || !summarySources.length) throw new DocumentError("ungrounded");

  return {
    summary: data.summary.trim(),
    summarySources,
    points,
    notInDocument: Array.isArray(data.notInDocument) ? data.notInDocument.filter(isNonEmptyString).map((item) => item.trim()).slice(0, 10) : [],
    droppedPoints: candidates.length - points.length,
  };
}
