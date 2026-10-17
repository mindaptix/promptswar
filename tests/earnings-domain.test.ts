import { describe, expect, it } from "vitest";
import { MAX_RUPEES_PER_ENTRY, parseEarningsInput } from "@/modules/earnings/domain/earnings";

describe("earnings validation", () => {
  it.each([
    [{ income: 10 }, { income: 1000, expense: 0 }],
    [{ income: 0, expense: 10.25 }, { income: 0, expense: 1025 }],
    [{ income: 0.29, expense: 0 }, { income: 29, expense: 0 }],
    [{ income: MAX_RUPEES_PER_ENTRY, expense: 0.01 }, { income: 100000000, expense: 1 }],
  ])("converts valid rupees to integer paise", (body, expected) => {
    expect(parseEarningsInput(body)).toEqual(expect.objectContaining(expected));
  });

  it("accepts an expense purpose and selected date", () => {
    expect(parseEarningsInput({ income: 500, expense: 120, expenseNote: "Fuel", date: "2026-10-16" })).toEqual({
      income: 50000, expense: 12000, expenseNote: "Fuel", date: "2026-10-16",
    });
  });

  it.each([
    { income: 10, expenseNote: 42 },
    { income: 10, expenseNote: "x".repeat(161) },
    { income: 10, date: "not-a-date" },
    { income: 10, date: "2026-02-30" },
    { income: 10, date: "2999-01-01" },
  ])("rejects invalid metadata %#", (body) => {
    expect(() => parseEarningsInput(body)).toThrow();
  });

  it.each([
    null,
    undefined,
    [],
    "10",
    {},
    { income: true },
    { income: "10" },
    { income: Number.NaN },
    { income: Number.POSITIVE_INFINITY },
    { income: -0.01 },
    { income: 10, expense: false },
    { income: 10, expense: -1 },
    { income: 0, expense: 0 },
    { income: MAX_RUPEES_PER_ENTRY + 0.01 },
    { income: 0.001 },
    { income: Number.MAX_SAFE_INTEGER },
  ])("rejects invalid input %#", (body) => {
    expect(() => parseEarningsInput(body)).toThrow();
  });
});
