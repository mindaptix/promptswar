"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/shared/ui/icon";
import {
  COMPLAINT_CATEGORIES,
  placeholders,
  remainingPlaceholders,
  renderComplaintText,
  type ComplaintCategory,
  type ComplaintDraft,
  type ComplaintFacts,
  type ComplaintSummary,
  type MissingDetail,
} from "@/modules/complaints/domain/complaints";
import styles from "@/shared/ui/panel.module.css";

type Props = { hindi: boolean; initialHistory: ComplaintSummary[] };

const categoryLabels: Record<ComplaintCategory, [string, string]> = {
  payment: ["Payment", "भुगतान"],
  deactivation: ["Account closed", "अकाउंट बंद"],
  safety: ["Safety", "सुरक्षा"],
  harassment: ["Harassment", "उत्पीड़न"],
  other: ["Other", "अन्य"],
};

const missingLabels: Record<MissingDetail, [string, string]> = {
  platform: ["Company or app name", "कंपनी या ऐप का नाम"],
  incident_date: ["Date", "तारीख"],
  amount: ["Amount", "राशि"],
  reference_id: ["Order or trip ID", "ऑर्डर या ट्रिप आईडी"],
  location: ["Location", "जगह"],
  desired_resolution: ["What you want done", "आप क्या चाहते हैं"],
};

const emptyFacts = { category: "payment" as ComplaintCategory, platform: "", incidentDate: "", amount: "", referenceId: "", location: "", description: "", desiredResolution: "" };

export function ComplaintPanel({ hindi, initialHistory }: Props) {
  const language = hindi ? "hi" : "en";
  const t = (en: string, hi: string) => (hindi ? hi : en);
  const hindiRef = useRef(hindi);
  useEffect(() => { hindiRef.current = hindi; }, [hindi]);
  const [facts, setFacts] = useState(emptyFacts);
  const [draft, setDraft] = useState<ComplaintDraft | null>(null);
  const [missing, setMissing] = useState<MissingDetail[]>([]);
  const [unsupported, setUnsupported] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"draft" | "save" | "">("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [history, setHistory] = useState<ComplaintSummary[]>(initialHistory);

  useEffect(() => {
    const onPrefill = (event: Event) => {
      const detail = (event as CustomEvent<ComplaintCategory | { category?: ComplaintCategory; amount?: string; description?: string; platform?: string }>).detail;
      const prefill = typeof detail === "string" ? { category: detail } : detail;
      setFacts((current) => ({
        ...emptyFacts,
        platform: prefill?.platform || current.platform,
        category: prefill?.category && COMPLAINT_CATEGORIES.includes(prefill.category) ? prefill.category : current.category,
        amount: prefill?.amount || "",
        description: prefill?.description || "",
      }));
      setDraft(null);
      setMissing([]);
      setUnsupported([]);
      setSavedId(null);
      setError("");
      setStatus(hindiRef.current ? "नई शिकायत शुरू हुई। विवरण जांचें और जोड़ें।" : "New complaint started. Check and add the details.");
      document.getElementById("complaints")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("complaint-description")?.focus();
    };
    window.addEventListener("draft-complaint", onPrefill);
    return () => window.removeEventListener("draft-complaint", onPrefill);
  }, []);

  const payloadFacts = (): ComplaintFacts => ({
    category: facts.category,
    platform: facts.platform,
    incidentDate: facts.incidentDate,
    amount: facts.amount.trim() === "" ? null : Number(facts.amount),
    referenceId: facts.referenceId,
    location: facts.location,
    description: facts.description,
    desiredResolution: facts.desiredResolution,
  });

  async function createDraft(mode: "template" | "ai") {
    setPending("draft");
    setError("");
    setStatus(mode === "ai" ? t("Writing a draft…", "ड्राफ्ट लिखा जा रहा है…") : t("Preparing a template…", "टेम्पलेट बन रहा है…"));
    try {
      const response = await fetch("/api/complaints/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facts: payloadFacts(), language, mode }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || t("The draft could not be created.", "ड्राफ्ट नहीं बन सका।"));
        setStatus("");
        return;
      }
      setDraft(result.draft);
      setMissing(result.missing || []);
      setUnsupported(result.unsupported || []);
      setSavedId(null);
      setStatus(t("Draft ready. Edit it, then save or download.", "ड्राफ्ट तैयार है। बदलें, फिर सेव या डाउनलोड करें।"));
      document.getElementById("complaint-subject")?.focus();
    } catch {
      setError(t("Network error. Check your connection and try again.", "नेटवर्क में समस्या है। कनेक्शन जांचकर फिर कोशिश करें।"));
      setStatus("");
    } finally {
      setPending("");
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setPending("save");
    setError("");
    try {
      const path = savedId ? `/api/complaints/${savedId}` : "/api/complaints";
      const response = await fetch(path, {
        method: savedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedId ? { draft } : { facts: payloadFacts(), draft, language }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || t("Could not save.", "सेव नहीं हो सका।"));
        return;
      }
      setSavedId(result.complaint.id);
      setHistory((current) => [result.complaint, ...current.filter((item: ComplaintSummary) => item.id !== result.complaint.id)]);
      setStatus(t("Saved to your account.", "आपके अकाउंट में सेव हो गया।"));
    } catch {
      setError(t("Network error. Check your connection and try again.", "नेटवर्क में समस्या है। कनेक्शन जांचकर फिर कोशिश करें।"));
    } finally {
      setPending("");
    }
  }

  function download() {
    if (!draft) return;
    const blob = new Blob([renderComplaintText(draft, language)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "complaint.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus(t("Downloaded complaint.txt.", "complaint.txt डाउनलोड हो गई।"));
  }

  async function copyText() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(renderComplaintText(draft, language));
      setStatus(t("Copied. Paste it into the company app or an email.", "कॉपी हो गया। कंपनी ऐप या ईमेल में पेस्ट करें।"));
    } catch {
      setError(t("Copy failed. Use download instead.", "कॉपी नहीं हो सका। डाउनलोड करें।"));
    }
  }

  const set = (field: keyof typeof facts) => (event: { target: { value: string } }) => setFacts((current) => ({ ...current, [field]: event.target.value }));
  const placeholdersLeft = draft ? remainingPlaceholders(draft) : [];

  return (
    <section id="complaints" className={styles.panel} aria-labelledby="complaints-title">
      <div className={styles.header}>
        <span className={styles.icon}><Icon name="document" size={20} /></span>
        <div>
          <h2 id="complaints-title">{t("Write a complaint", "शिकायत लिखें")}</h2>
          <p>{t("Tell what happened. The draft uses only your facts, marks what is missing, and stays editable before you save or download it.", "जो हुआ वह लिखें। ड्राफ्ट सिर्फ़ आपके तथ्यों से बनता है, छूटी बातें दिखाता है, और सेव या डाउनलोड से पहले बदला जा सकता है।")}</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void createDraft("template"); }}>
        <label>{t("What is this about?", "यह किस बारे में है?")}
          <select value={facts.category} onChange={set("category")} disabled={Boolean(pending)}>
            {COMPLAINT_CATEGORIES.map((category) => <option key={category} value={category}>{hindi ? categoryLabels[category][1] : categoryLabels[category][0]}</option>)}
          </select>
        </label>
        <label>{t("Company or app", "कंपनी या ऐप")}<input value={facts.platform} onChange={set("platform")} maxLength={80} disabled={Boolean(pending)} placeholder={placeholders[language].platform} /></label>
        <label>{t("Date", "तारीख")}<input type="date" value={facts.incidentDate} onChange={set("incidentDate")} disabled={Boolean(pending)} /></label>
        <label>{t("Amount in ₹, if money is involved", "राशि ₹ में, अगर पैसे जुड़े हैं")}<input inputMode="decimal" value={facts.amount} onChange={set("amount")} disabled={Boolean(pending)} /></label>
        <label>{t("Order, trip, or partner ID", "ऑर्डर, ट्रिप या पार्टनर आईडी")}<input value={facts.referenceId} onChange={set("referenceId")} maxLength={80} disabled={Boolean(pending)} /></label>
        <label>{t("Location", "जगह")}<input value={facts.location} onChange={set("location")} maxLength={120} disabled={Boolean(pending)} /></label>
        <label htmlFor="complaint-description">{t("What happened?", "क्या हुआ?")}
          <textarea id="complaint-description" required minLength={20} maxLength={3000} value={facts.description} onChange={set("description")} disabled={Boolean(pending)} aria-invalid={error ? true : undefined} />
        </label>
        <label>{t("What should the company do?", "कंपनी क्या करे?")}
          <textarea maxLength={500} value={facts.desiredResolution} onChange={set("desiredResolution")} disabled={Boolean(pending)} />
        </label>
        <div className={styles.row}>
          <button type="submit" disabled={Boolean(pending)}>{pending === "draft" ? t("Working…", "काम चल रहा है…") : t("Start from a template", "टेम्पलेट से शुरू करें")}</button>
          <button type="button" className={styles.secondary} disabled={Boolean(pending)} onClick={() => void createDraft("ai")}>{t("Write with AI", "एआई से लिखें")}</button>
        </div>
      </form>
      <p role="status">{status}</p>
      {error && <p className={styles.alert} role="alert">{error}</p>}

      {draft && (
        <form className={styles.draft} onSubmit={save}>
          {missing.length > 0 && (
            <>
              <p><strong>{t("Still missing. Placeholders are in the draft until you fill them.", "अभी छूटा है। जब तक आप न भरें, ड्राफ्ट में खाली जगह रहेगी।")}</strong></p>
              <ul className={styles.missing}>{missing.map((item) => <li key={item}>{hindi ? missingLabels[item][1] : missingLabels[item][0]}</li>)}</ul>
            </>
          )}
          {unsupported.length > 0 && <p className={styles.notice} role="alert">{t("Check these numbers. They were not in the facts you entered:", "ये नंबर जांचें। ये आपके लिखे तथ्यों में नहीं थे:")} {unsupported.join(", ")}</p>}
          <label>{t("Subject", "विषय")}<input id="complaint-subject" value={draft.subject} maxLength={200} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label>
          <label>{t("Summary", "सार")} <textarea value={draft.summary} maxLength={2000} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
          <label>{t("Facts, one per line", "तथ्य, हर लाइन पर एक")}<textarea value={draft.facts.join("\n")} onChange={(event) => setDraft({ ...draft, facts: event.target.value.split("\n") })} /></label>
          <label>{t("Request", "अनुरोध")}<textarea value={draft.request} maxLength={2000} onChange={(event) => setDraft({ ...draft, request: event.target.value })} /></label>
          <label>{t("Evidence to attach, one per line", "जोड़ने वाले सबूत, हर लाइन पर एक")}<textarea value={draft.evidence.join("\n")} onChange={(event) => setDraft({ ...draft, evidence: event.target.value.split("\n").filter(Boolean) })} /></label>
          {placeholdersLeft.length > 0 && <p className={styles.hint}>{t("Placeholders still in the draft:", "ड्राफ्ट में अभी ये खाली जगहें हैं:")} {placeholdersLeft.join(" ")}</p>}
          <div className={styles.row}>
            <button type="submit" disabled={Boolean(pending)}>{pending === "save" ? t("Saving…", "सेव हो रहा है…") : t("Save", "सेव करें")}</button>
            <button type="button" className={styles.secondary} onClick={download}>{t("Download .txt", ".txt डाउनलोड")}</button>
            <button type="button" className={styles.secondary} onClick={() => void copyText()}>{t("Copy", "कॉपी")}</button>
          </div>
        </form>
      )}

      {history.length > 0 && (
        <details className={styles.history}>
          <summary>{t(`Saved complaints (${history.length})`, `सेव शिकायतें (${history.length})`)}</summary>
          <ul>{history.map((item) => <li key={item.id}>{item.subject}</li>)}</ul>
        </details>
      )}
    </section>
  );
}
