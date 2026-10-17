import { NextResponse } from "next/server";
import { getSessionUserId } from "@/shared/server/auth";
import { ensureSchema, query } from "@/shared/server/postgres";
import { randomUUID } from "node:crypto";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  await ensureSchema();
  const { rows } = await query("SELECT id, income, expense, created_at AS time FROM earnings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [userId]);
  return NextResponse.json({ entries: rows });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json();
  const income = Number(body.income); const expense = Number(body.expense || 0);
  if (!Number.isFinite(income) || !Number.isFinite(expense) || income < 0 || expense < 0 || income + expense === 0) return NextResponse.json({ error: "Enter valid amounts." }, { status: 400 });
  await ensureSchema();
  const id = randomUUID();
  await query("INSERT INTO earnings (id, user_id, income, expense) VALUES ($1, $2, $3, $4)", [id, userId, Math.round(income * 100), Math.round(expense * 100)]);
  return NextResponse.json({ id }, { status: 201 });
}
