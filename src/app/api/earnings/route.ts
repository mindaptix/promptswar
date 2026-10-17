import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUserId } from "@/shared/server/auth";
import { getDatabase } from "@/shared/server/mongodb";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId || !ObjectId.isValid(userId)) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const entries = await (await getDatabase()).collection("earnings").find({ userId: new ObjectId(userId) }).sort({ createdAt: -1 }).limit(100).toArray();
  return NextResponse.json({ entries: entries.map((entry) => ({ id: entry._id.toString(), income: entry.income, expense: entry.expense, time: entry.createdAt })) });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId || !ObjectId.isValid(userId)) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json();
  const income = Number(body.income); const expense = Number(body.expense || 0);
  if (!Number.isFinite(income) || !Number.isFinite(expense) || income < 0 || expense < 0 || income + expense === 0) return NextResponse.json({ error: "Enter valid amounts." }, { status: 400 });
  const result = await (await getDatabase()).collection("earnings").insertOne({ userId: new ObjectId(userId), income: Math.round(income * 100), expense: Math.round(expense * 100), createdAt: new Date() });
  return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
}
