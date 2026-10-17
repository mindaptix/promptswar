"use client";

import { useEffect, useState, type FormEvent } from "react";

export type EarningsEntry = { id: string; income: number; expense: number; time: string };

type Copy = (en: string, hi: string) => string;

/** Loads and appends the signed-in user's earnings. Amounts sent to the API stay in rupees. */
export function useEarnings(t: Copy) {
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [status, setStatus] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const income = entries.reduce((sum, entry) => sum + entry.income, 0);
  const expense = entries.reduce((sum, entry) => sum + entry.expense, 0);

  useEffect(() => {
    fetch("/api/earnings").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      setSignedIn(true);
      setEntries(data.entries || []);
    }).catch(() => undefined);
  }, []);

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
        setEntries((previous) => [{ id: result.id, income: Math.round(earned * 100), expense: Math.round(spent * 100), time: new Date().toISOString() }, ...previous]);
        setSignedIn(true);
        setStatus(t("Entry saved to your account.", "एंट्री आपके अकाउंट में सेव हो गई।"));
        form.reset();
      })
      .catch(() => setStatus(t("Network error. Check your connection and try again.", "नेटवर्क में समस्या है। कनेक्शन जांचकर फिर कोशिश करें।")))
      .finally(() => setSaving(false));
  }

  return { entries, income, expense, signedIn, saving, status, setStatus, addEntry };
}
