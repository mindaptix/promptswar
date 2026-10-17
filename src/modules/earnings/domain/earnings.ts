export const MAX_RUPEES_PER_ENTRY = 1_000_000;

export type EarningsInput = Readonly<{ income: number; expense: number; expenseNote: string; date: string }>;
export type EarningsEntry = Readonly<{ id: string; income: number; expense: number; expenseNote: string; date: string; time: string }>;

export class EarningsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EarningsValidationError";
  }
}

const indiaDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

function parseMoney(value: unknown, field: string, optional = false): number {
  if (optional && value === undefined) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new EarningsValidationError(`${field} must be a number.`);
  }
  if (value < 0) throw new EarningsValidationError(`${field} cannot be negative.`);
  if (value > MAX_RUPEES_PER_ENTRY) {
    throw new EarningsValidationError(`${field} cannot exceed ₹10,00,000.`);
  }

  const paise = value * 100;
  const roundedPaise = Math.round(paise);
  if (!Number.isSafeInteger(roundedPaise) || Math.abs(paise - roundedPaise) > 1e-8) {
    throw new EarningsValidationError(`${field} can have at most two decimal places.`);
  }
  return roundedPaise;
}

/** Validates JSON input and returns integer paise for safe storage. */
export function parseEarningsInput(value: unknown): EarningsInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EarningsValidationError("Request body must be an object.");
  }
  const body = value as Record<string, unknown>;
  const income = parseMoney(body.income, "Income");
  const expense = parseMoney(body.expense, "Expense", true);
  if (income === 0 && expense === 0) {
    throw new EarningsValidationError("Enter at least one amount above ₹0.");
  }
  if (body.expenseNote !== undefined && typeof body.expenseNote !== "string") {
    throw new EarningsValidationError("Expense details must be text.");
  }
  const expenseNote = typeof body.expenseNote === "string" ? body.expenseNote.trim() : "";
  if (expenseNote.length > 160) throw new EarningsValidationError("Expense details cannot exceed 160 characters.");
  const today = indiaDateFormatter.format(new Date());
  const date = body.date === undefined ? today : body.date;
  const parsedDate = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : new Date(Number.NaN);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || date > today) {
    throw new EarningsValidationError("Date must be a valid date in YYYY-MM-DD format.");
  }
  return { income, expense, expenseNote, date };
}
