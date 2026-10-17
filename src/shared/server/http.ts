export class BodyTooLargeError extends Error {
  constructor() {
    super("Request body is too large");
    this.name = "BodyTooLargeError";
  }
}

/** Reads at most maxBytes of the body, rejecting early on a declared or actual overflow. */
export async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** Parses multipart form data from a body already read within a size bound. */
export async function readBoundedFormData(request: Request, maxBytes: number): Promise<FormData | null> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) return null;
  const body = await readBoundedBody(request, maxBytes);
  try {
    return await new Response(body.buffer as ArrayBuffer, { headers: { "content-type": contentType } }).formData();
  } catch {
    return null;
  }
}

/** Returns the parsed JSON body when it is a plain object, otherwise null. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
