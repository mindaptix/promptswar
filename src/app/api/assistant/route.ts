import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";

const systemPrompt = `You are Gig Worker Companion, a practical assistant for delivery partners, drivers, and informal workers in India. Answer in the user's language. Use simple, respectful language. Give actionable steps. Never invent government scheme eligibility, legal outcomes, payment status, or official contacts. Say when information needs verification and point users to official sources. For complaints, produce an editable draft with subject, facts, requested resolution, and placeholders for missing details. Do not ask for passwords, OTPs, API keys, or unnecessary personal data.`;

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required to use the AI assistant." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI service is not configured yet." }, { status: 503 });
  let body: { question?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 2000) return NextResponse.json({ error: "Ask a question between 1 and 2000 characters." }, { status: 400 });
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", instructions: systemPrompt, input: question, temperature: 0.2, max_output_tokens: 700 }) });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: "The AI service could not answer right now." }, { status: 502 });
    const answer = typeof data.output_text === "string" ? data.output_text.trim() : data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content || []).map((item: { text?: string }) => item.text || "").join("\n").trim();
    if (!answer) return NextResponse.json({ error: "The AI returned an empty answer." }, { status: 502 });
    return NextResponse.json({ answer });
  } catch { return NextResponse.json({ error: "The AI service is temporarily unavailable." }, { status: 502 }); }
}
