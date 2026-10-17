import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";
import { readJsonObject } from "@/shared/server/http";
import { createResponse, isOpenAIConfigured, OpenAIError } from "@/shared/server/openai";
import { getEarningsSummary } from "@/modules/earnings/application/earnings-service";

const systemPrompt = `You are Gig Worker Companion, a practical assistant for delivery partners, drivers, and informal workers in India. Answer in the user's language. Use simple, respectful language. Give actionable steps. Never invent government scheme eligibility, legal outcomes, payment status, or official contacts. Say when information needs verification and point users to official sources. For complaints, produce an editable draft with subject, facts, requested resolution, and placeholders for missing details. Do not ask for passwords, OTPs, API keys, or unnecessary personal data.`;

const rupees = (paise: number) => (paise / 100).toFixed(2);

async function instructionsFor(userId: string) {
  const summary = await getEarningsSummary(userId);
  return `${systemPrompt}

Here is the authenticated user's real earnings data saved in this app. Amounts are in Indian rupees and today's date boundary uses Asia/Kolkata time.
- Today: income ₹${rupees(summary.todayIncome)}, expenses ₹${rupees(summary.todayExpense)}, net earnings ₹${rupees(summary.todayIncome - summary.todayExpense)}, entries ${summary.todayEntries}.
- All saved entries: income ₹${rupees(summary.totalIncome)}, expenses ₹${rupees(summary.totalExpense)}, net earnings ₹${rupees(summary.totalIncome - summary.totalExpense)}, entries ${summary.totalEntries}.
When the user asks how much they earned, spent, or saved, answer with only the direct result. Do not add a source disclaimer, explanation, or phrases such as "based on entries saved in this app." Do not tell them to check another platform. If there are no relevant entries, say only that no earnings entry has been saved for that period.`;
}

const failures = {
  not_configured: ["AI service is not configured yet.", 503],
  timeout: ["The AI service took too long to answer. Please try again.", 504],
  upstream: ["The AI service could not answer right now.", 502],
  empty: ["The AI returned an empty answer.", 502],
} as const;

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required to use the AI assistant." }, { status: 401 });
  if (!isOpenAIConfigured()) return NextResponse.json({ error: failures.not_configured[0] }, { status: 503 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 2000) return NextResponse.json({ error: "Ask a question between 1 and 2000 characters." }, { status: 400 });
  try {
    return NextResponse.json({ answer: await createResponse({ instructions: await instructionsFor(userId), input: question, maxOutputTokens: 700 }) });
  } catch (error) {
    const [message, status] = error instanceof OpenAIError ? failures[error.reason] : failures.upstream;
    return NextResponse.json({ error: message }, { status });
  }
}
