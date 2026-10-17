import { describe, expect, it } from "vitest";
import { MAX_RUPEES_PER_ENTRY, parseEarningsInput } from "@/modules/earnings/domain/earnings";

describe("earnings validation", () => {
  it.each([
    [{ income: 10 }, { income: 1000, expense: 0 }],
    [{ income: 0, expense: 10.25 }, { income: 0, expense: 1025 }],
    [{ income: 0.29, expense: 0 }, { income: 29, expense: 0 }],
    [{ income: MAX_RUPEES_PER_ENTRY, expense: 0.01 }, { income: 100000000, expense: 1 }],
  ])("converts valid rupees to integer paise", (body, expected) => {
    expect(parseEarningsInput(body)).toEqual(expected);
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
