import "server-only";

export type OpenAIFailure = "not_configured" | "timeout" | "upstream" | "empty";

export class OpenAIError extends Error {
  constructor(readonly reason: OpenAIFailure) {
    super(`OpenAI request failed: ${reason}`);
    this.name = "OpenAIError";
  }
}

export const isOpenAIConfigured = () => Boolean(process.env.OPENAI_API_KEY);

const providerTimeoutMs = () => {
  const value = Number(process.env.OPENAI_TIMEOUT_MS);
  return Number.isInteger(value) && value >= 1_000 && value <= 60_000 ? value : 20_000;
};

type ResponsesOutput = { output_text?: unknown; output?: { content?: { text?: string }[] }[] };

function outputText(data: ResponsesOutput): string {
  if (typeof data.output_text === "string") return data.output_text.trim();
  if (!Array.isArray(data.output)) return "";
  return data.output.flatMap((item) => item.content || []).map((item) => item.text || "").join("\n").trim();
}

type ResponseRequest = {
  instructions: string;
  input: string;
  maxOutputTokens: number;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
};

/** Calls the OpenAI Responses API with a bounded deadline and returns the output text. */
export async function createResponse({ instructions, input, maxOutputTokens, jsonSchema }: ResponseRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAIError("not_configured");
  let data: ResponsesOutput;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(providerTimeoutMs()),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        instructions,
        input,
        temperature: 0.2,
        max_output_tokens: maxOutputTokens,
        ...(jsonSchema ? { text: { format: { type: "json_schema", name: jsonSchema.name, schema: jsonSchema.schema, strict: true } } } : {}),
      }),
    });
    data = await response.json();
    if (!response.ok) throw new OpenAIError("upstream");
  } catch (error) {
    if (error instanceof OpenAIError) throw error;
    if (error instanceof DOMException && error.name === "TimeoutError") throw new OpenAIError("timeout");
    throw new OpenAIError("upstream");
  }
  const text = outputText(data);
  if (!text) throw new OpenAIError("empty");
  return text;
}
