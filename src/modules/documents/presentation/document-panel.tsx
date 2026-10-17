"use client";

import { useRef, useState, type FormEvent } from "react";
import { Icon } from "@/shared/ui/icon";
import { MAX_UPLOAD_BYTES, type DocumentDetail, type DocumentSummary, type Passage } from "@/modules/documents/domain/documents";
import styles from "./document-panel.module.css";

type Props = { hindi: boolean; initialHistory: DocumentSummary[] };
type Status = { kind: "idle" | "pending" | "error" | "done"; message: string };

const hindiErrors: Record<string, string> = {
  missing_file: "अपलोड करने के लिए फ़ाइल चुनें।",
  too_large: "फ़ाइल 2 MB से बड़ी है।",
  empty_file: "फ़ाइल खाली है।",
  unsupported_type: "केवल PDF और सादा टेक्स्ट (.txt) फ़ाइलें समर्थित हैं।",
  type_mismatch: "फ़ाइल की सामग्री उसके प्रकार से मेल नहीं खाती।",
  invalid_text: "टेक्स्ट फ़ाइल सही UTF-8 टेक्स्ट नहीं है।",
  unreadable: "PDF पढ़ी नहीं जा सकी। यह खराब या पासवर्ड से सुरक्षित हो सकती है।",
  too_many_pages: "PDF में अधिकतम 30 पेज हो सकते हैं।",
  no_text: "पढ़ने लायक टेक्स्ट नहीं मिला। स्कैन या फ़ोटो वाले दस्तावेज़ अभी समर्थित नहीं हैं।",
  ungrounded: "व्याख्या दस्तावेज़ के टेक्स्ट से मेल नहीं खा सकी। फिर से कोशिश करें।",
  not_configured: "एआई सेवा अभी सेट नहीं है।",
  timeout: "एआई सेवा ने बहुत देर लगाई। फिर से कोशिश करें।",
  upstream: "एआई सेवा अभी इस दस्तावेज़ को समझा नहीं सकी।",
  empty: "एआई ने खाली जवाब दिया।",
};

function SourceChips({ ids, label, onSelect }: { ids: string[]; label: string; onSelect: (id: string) => void }) {
  return (
    <span className={styles.chips}>
      {ids.map((id) => (
        <button key={id} type="button" className={styles.chip} onClick={() => onSelect(id)} aria-label={`${label} ${id}`}>
          {id}
        </button>
      ))}
    </span>
  );
}

function highlight(passage: Passage, quote: string | null) {
  if (!quote) return passage.text;
  const index = passage.text.toLowerCase().indexOf(quote.toLowerCase());
  if (index < 0) return passage.text;
  return (
    <>
      {passage.text.slice(0, index)}
      <mark>{passage.text.slice(index, index + quote.length)}</mark>
      {passage.text.slice(index + quote.length)}
    </>
  );
}

export function DocumentPanel({ hindi, initialHistory }: Props) {
  const t = (en: string, hi: string) => (hindi ? hi : en);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [history, setHistory] = useState<DocumentSummary[]>(initialHistory);
  const [selected, setSelected] = useState<{ id: string; quote: string | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const pending = status.kind === "pending";

  const errorText = (code: string | undefined, fallback: string) => (hindi && code && hindiErrors[code]) || fallback;

  function show(detail: DocumentDetail) {
    setDocument(detail);
    setSelected(null);
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  function selectPassage(id: string, quote: string | null = null) {
    setSelected({ id, quote });
    const target = window.document.getElementById(`passage-${id}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file) return setStatus({ kind: "error", message: errorText("missing_file", "Choose a file to upload.") });
    if (file.size > MAX_UPLOAD_BYTES) return setStatus({ kind: "error", message: errorText("too_large", "The file is larger than 2 MB.") });
    if (!/\.(pdf|txt)$/i.test(file.name)) return setStatus({ kind: "error", message: errorText("unsupported_type", "Only PDF and plain text (.txt) files are supported.") });

    const body = new FormData();
    body.set("file", file);
    body.set("language", hindi ? "hi" : "en");
    setStatus({ kind: "pending", message: t("Reading and explaining your document…", "आपका दस्तावेज़ पढ़ा और समझाया जा रहा है…") });
    try {
      const response = await fetch("/api/documents", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setStatus({ kind: "error", message: errorText(result.code, result.error || t("Upload failed.", "अपलोड नहीं हो सका।")) });
      const detail = result.document as DocumentDetail;
      show(detail);
      setHistory((previous) => [{ id: detail.id, fileName: detail.fileName, kind: detail.kind, createdAt: detail.createdAt }, ...previous.filter((item) => item.id !== detail.id)]);
      setStatus({ kind: "done", message: t("Explanation ready. Every point links to the original text.", "व्याख्या तैयार है। हर बिंदु मूल टेक्स्ट से जुड़ा है।") });
      form.reset();
    } catch {
      setStatus({ kind: "error", message: t("Network error. Check your connection and try again.", "नेटवर्क में समस्या है। कनेक्शन जांचकर फिर कोशिश करें।") });
    }
  }

  async function open(id: string) {
    setStatus({ kind: "pending", message: t("Opening document…", "दस्तावेज़ खुल रहा है…") });
    try {
      const response = await fetch(`/api/documents/${id}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setStatus({ kind: "error", message: result.error || t("Could not open the document.", "दस्तावेज़ नहीं खुल सका।") });
      show(result.document);
      setStatus({ kind: "done", message: "" });
    } catch {
      setStatus({ kind: "error", message: t("Network error. Check your connection and try again.", "नेटवर्क में समस्या है। कनेक्शन जांचकर फिर कोशिश करें।") });
    }
  }

  return (
    <section id="documents" className={styles.panel} aria-labelledby="documents-title">
      <div className={styles.header}>
        <span className={styles.icon}><Icon name="document" size={20} /></span>
        <div>
          <h2 id="documents-title">{t("Understand a document", "दस्तावेज़ समझें")}</h2>
          <p>{t("Upload a PDF or text file (up to 2 MB). Each explanation point links to the exact words in your document.", "PDF या टेक्स्ट फ़ाइल (2 MB तक) अपलोड करें। हर बिंदु आपके दस्तावेज़ के सही शब्दों से जुड़ा होगा।")}</p>
        </div>
      </div>

      <form className={styles.upload} onSubmit={upload} aria-busy={pending}>
        <label htmlFor="document-file">{t("Document file", "दस्तावेज़ फ़ाइल")}</label>
        <input id="document-file" ref={fileRef} name="file" type="file" accept=".pdf,.txt,application/pdf,text/plain" disabled={pending} aria-describedby="document-help document-status" onChange={() => setStatus({ kind: "idle", message: "" })} />
        <small id="document-help">{t("Supported: PDF with selectable text, .txt. Scanned images are not supported yet.", "समर्थित: चुनने योग्य टेक्स्ट वाली PDF, .txt। स्कैन की गई इमेज अभी समर्थित नहीं हैं।")}</small>
        <button type="submit" disabled={pending}>{pending ? t("Working…", "काम चल रहा है…") : t("Explain document", "दस्तावेज़ समझाएं")}</button>
      </form>
      <p id="document-status" className={status.kind === "error" ? styles.error : styles.status} role={status.kind === "error" ? "alert" : "status"}>{status.message}</p>

      {history.length > 0 && (
        <details className={styles.history}>
          <summary>{t(`Your documents (${history.length})`, `आपके दस्तावेज़ (${history.length})`)}</summary>
          <ul>
            {history.map((item) => (
              <li key={item.id}><button type="button" onClick={() => open(item.id)} disabled={pending}>{item.fileName}<small>{new Date(item.createdAt).toLocaleDateString(hindi ? "hi-IN" : "en-IN")}</small></button></li>
            ))}
          </ul>
        </details>
      )}

      {document && (
        <div className={styles.result}>
          <div className={styles.explanation}>
            <h3 ref={resultRef} tabIndex={-1}>{t("Explanation of", "व्याख्या:")} {document.fileName}</h3>
            <p className={styles.notice}>{t("Generated by AI from the passages on the right. It may be incomplete; check the original text before acting.", "यह एआई ने दाईं ओर के अंशों से बनाई है। यह अधूरी हो सकती है; कदम उठाने से पहले मूल टेक्स्ट देखें।")}</p>
            <h4>{t("Summary", "सारांश")}</h4>
            <p>{document.explanation.summary} <SourceChips ids={document.explanation.summarySources} label={t("Show passage", "अंश दिखाएं")} onSelect={(id) => selectPassage(id)} /></p>
            <button type="button" className={styles.chip} onClick={() => window.dispatchEvent(new CustomEvent("draft-complaint", { detail: { category: "other", description: document.explanation.summary } }))}>{t("Draft a complaint from this document", "इस दस्तावेज़ से शिकायत लिखें")}</button>
            <h4>{t("Key points", "मुख्य बातें")}</h4>
            <ol className={styles.points}>
              {document.explanation.points.map((point, index) => (
                <li key={index}>
                  <p>{point.text}</p>
                  <blockquote>“{point.quote}”</blockquote>
                  <SourceChips ids={point.sources} label={t("Show passage", "अंश दिखाएं")} onSelect={(id) => selectPassage(id, point.quote)} />
                </li>
              ))}
            </ol>
            {document.explanation.notInDocument.length > 0 && (
              <>
                <h4>{t("Not stated in this document", "इस दस्तावेज़ में नहीं लिखा")}</h4>
                <ul className={styles.unknowns}>{document.explanation.notInDocument.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </>
            )}
            {document.explanation.droppedPoints > 0 && (
              <p className={styles.notice}>{t(`${document.explanation.droppedPoints} AI point(s) were hidden because they could not be matched to the document text.`, `${document.explanation.droppedPoints} एआई बिंदु छिपाए गए क्योंकि वे दस्तावेज़ के टेक्स्ट से मेल नहीं खाते थे।`)}</p>
            )}
          </div>

          <div className={styles.original}>
            <h3>{t("Original text", "मूल टेक्स्ट")}</h3>
            {document.truncated && <p className={styles.notice}>{t("Only the first 30,000 characters were read and explained.", "केवल पहले 30,000 अक्षर पढ़े और समझाए गए।")}</p>}
            <ol className={styles.passages}>
              {document.passages.map((passage) => (
                <li key={passage.id} id={`passage-${passage.id}`} tabIndex={-1} className={selected?.id === passage.id ? styles.selected : undefined}>
                  <span className={styles.passageId}>{passage.id}</span>
                  <p>{selected?.id === passage.id ? highlight(passage, selected.quote) : passage.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
