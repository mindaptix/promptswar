"use client";

import { useState, type FormEvent } from "react";

export type EarningsEntry = { id: string; income: number; expense: number; time: string };
export type EarningsOverview = { entries: EarningsEntry[]; totals: { income: number; expense: number; entries: number } };

type Copy = (en: string, hi: string) => string;

/** Starts from server-rendered earnings and appends new entries. Amounts sent to the API stay in rupees; totals are in paise. */
export function useEarnings(t: Copy, initial: EarningsOverview) {
  const [entries, setEntries] = useState<EarningsEntry[]>(initial.entries);
  const [totals, setTotals] = useState(initial.totals);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const earned = Number(data.get("income"));
    const spent = Number(data.get("expense") || 0);
    const valid = [earned, spent].every((value) => Number.isFinite(value) && value >= 0 && value <= 1_000_000);
    if (!valid || earned + spent === 0) {
      setStatus(t("Enter at least one amount above ₹0 (up to ₹10,00,000 per field).", "कम से कम एक राशि ₹0 से अधिक भरें (हर फ़ील्ड में अधिकतम ₹10,00,000)।"));
      return;
    }
    setSaving(true);
    setStatus(t("Saving…", "सेव हो रहा है…"));
    fetch("/api/earnings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ income: earned, expense: spent }) })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          setStatus(result.error || t("Unable to save entry.", "एंट्री सेव नहीं हो सकी।"));
          return;
        }
        const income = Math.round(earned * 100);
        const expense = Math.round(spent * 100);
        setEntries((previous) => [{ id: result.id, income, expense, time: new Date().toISOString() }, ...previous]);
        setTotals((previous) => ({ income: previous.income + income, expense: previous.expense + expense, entries: previous.entries + 1 }));
        setStatus(t("Entry saved to your account.", "एंट्री आपके अकाउंट में सेव हो गई।"));
        form.reset();
      })
      .catch(() => setStatus(t("Network error. Check your connection and try again.", "नेटवर्क में समस्या है। कनेक्शन जांचकर फिर कोशिश करें।")))
      .finally(() => setSaving(false));
  }

  return { entries, income: totals.income, expense: totals.expense, signedIn: true, saving, status, setStatus, addEntry };
}
