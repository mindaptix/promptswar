"use client";

import { useRef, useState } from "react";
import { Icon } from "@/shared/ui/icon";
import styles from "./home-screen.module.css";

type Copy = (en: string, hi: string) => string;

/** Free-text assistant. Suggestions jump to the dedicated tool instead of hiding it behind a prompt. */
export function AssistantCard({ hindi, t }: { hindi: boolean; t: Copy }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLParagraphElement>(null);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || asking) return;
    setAsking(true);
    setAnswer(t("Thinking…", "सोच रहा हूं…"));
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, language: hindi ? "hi" : "en" }),
      });
      const result = await response.json();
      setAnswer(response.ok ? result.answer : result.error);
      answerRef.current?.focus();
    } catch {
      setAnswer(t("Network error. Check your connection and try again.", "नेटवर्क में समस्या है। कनेक्शन जांचकर फिर कोशिश करें।"));
    } finally {
      setAsking(false);
    }
  }

  const jumps = [
    [t("Payment not received", "पेमेंट नहीं मिली"), "#complaints"],
    [t("Find a scheme", "योजना की जानकारी"), "#welfare"],
    [t("Document help", "दस्तावेज़ों में मदद"), "#documents"],
  ] as const;

  return (
    <section id="assistant" className={styles.assistant} aria-busy={asking}>
      <div className={styles.assistantHeading}>
        <span className={styles.assistantIcon}><Icon name="chat" size={23} /></span>
        <span className={styles.assistantLabel}>{t("YOUR AI ASSISTANT", "आपका एआई सहायक")}</span>
      </div>
      <h2>{t("What can I help you with?", "आज किस चीज़ में मदद चाहिए?")}</h2>
      <p>{t("Big question or small worry. Start in your own words.", "छोटा सवाल हो या बड़ी चिंता, अपनी भाषा में पूछें।")}</p>
      <form className={styles.composer} onSubmit={ask}>
        <label className={styles.srOnly} htmlFor="question">{t("Your question", "आपका सवाल")}</label>
        <textarea
          id="question"
          ref={questionRef}
          value={question}
          onChange={(event) => { setQuestion(event.target.value); setAnswer(""); }}
          placeholder={t("Type your question here…", "अपना सवाल यहां लिखें…")}
          rows={2}
          maxLength={2000}
          required
          disabled={asking}
        />
        <button type="submit" disabled={!question.trim() || asking} aria-label={t("Send question", "सवाल भेजें")}>
          <Icon name="send" size={20} />
        </button>
      </form>
      <div className={styles.suggestions}>
        {jumps.map(([label, href]) => (
          <a key={href} href={href}>{label}<Icon name="arrow" size={12} /></a>
        ))}
      </div>
      <p ref={answerRef} tabIndex={-1} className={styles.aiStatus} role="status" aria-live="polite">
        {answer || t("Ask a question and get a real AI response.", "सवाल पूछें और एआई से जवाब पाएं।")}
      </p>
    </section>
  );
}
