"use client";

import { useState } from "react";
import { Icon } from "@/shared/ui/icon";
import { HELPLINES, SAFETY_GUIDES, helplineById, type ComplaintCategoryHint, type Situation } from "@/modules/safety/domain/safety";
import styles from "@/shared/ui/panel.module.css";

type Props = { hindi: boolean; onDraftComplaint?: (category: ComplaintCategoryHint) => void };

const reviewed = (date: string, hindi: boolean) => new Date(`${date}T00:00:00`).toLocaleDateString(hindi ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });

export function SafetyPanel({ hindi, onDraftComplaint }: Props) {
  const language = hindi ? "hi" : "en";
  const t = (en: string, hi: string) => (hindi ? hi : en);
  const [situation, setSituation] = useState<Situation | null>(null);
  const guide = SAFETY_GUIDES.find((item) => item.situation === situation);

  return (
    <section id="safety" className={styles.panel} aria-labelledby="safety-title">
      <div className={styles.header}>
        <span className={styles.icon}><Icon name="shield" size={20} /></span>
        <div>
          <h2 id="safety-title">{t("Safety help", "सुरक्षा मदद")}</h2>
          <p>{t("In danger right now? Call 112. For other situations, pick one below for simple next steps.", "अभी खतरे में हैं? 112 पर कॉल करें। बाकी स्थितियों के लिए नीचे से चुनें और आसान अगले कदम देखें।")}</p>
        </div>
      </div>

      <ul className={styles.helplines} aria-label={t("Helplines", "हेल्पलाइन")}>
        {HELPLINES.map((helpline) => (
          <li key={helpline.id}>
            <a className={`${styles.call} ${helpline.id === "emergency" ? "" : styles.callSecondary}`} href={`tel:${helpline.number}`}>
              {t("Call", "कॉल करें")} {helpline.number}
            </a>
            <small><strong>{helpline.name[language]}.</strong> {helpline.use[language]}</small>
          </li>
        ))}
      </ul>

      <div className={styles.options} role="group" aria-label={t("What is happening?", "क्या हो रहा है?")}>
        <p className={styles.hint} style={{ width: "100%", margin: "0 0 4px" }}>{t("What is happening?", "क्या हो रहा है?")}</p>
        {SAFETY_GUIDES.map((item) => (
          <button key={item.situation} type="button" className={styles.option} aria-pressed={situation === item.situation} aria-controls="safety-steps" onClick={() => setSituation(item.situation)}>
            {item.title[language]}
          </button>
        ))}
      </div>

      <div id="safety-steps" aria-live="polite">
        {guide && (
          <div className={styles.card} style={{ marginTop: 16 }}>
            <h3>{guide.title[language]}: {t("what to do", "क्या करें")}</h3>
            <ol>{guide.steps.map((item, index) => <li key={index}>{item[language]}</li>)}</ol>
            <p>
              {guide.helplines.map((id) => helplineById(id)).filter(Boolean).map((helpline) => (
                <a key={helpline!.id} className={styles.link} href={`tel:${helpline!.number}`} style={{ marginRight: 12 }}>{t("Call", "कॉल करें")} {helpline!.number}</a>
              ))}
              {guide.complaintCategory && onDraftComplaint && (
                <button type="button" className={styles.option} onClick={() => onDraftComplaint(guide.complaintCategory!)}>{t("Write a complaint about this", "इसकी शिकायत लिखें")}</button>
              )}
            </p>
            <p className={styles.source}>{t("General safety guidance, not legal advice. Follow instructions from emergency services.", "यह सामान्य सुरक्षा जानकारी है, कानूनी सलाह नहीं। आपातकालीन सेवाओं के निर्देश मानें।")}</p>
          </div>
        )}
      </div>

      <p className={styles.notice}>
        {t("Numbers reviewed on", "नंबरों की समीक्षा")} {reviewed(HELPLINES[0].reviewedOn, hindi)}.{" "}
        {HELPLINES.map((helpline, index) => (
          <span key={helpline.id}>{index > 0 && " · "}<a className={styles.link} href={helpline.sourceUrl} target="_blank" rel="noopener noreferrer">{new URL(helpline.sourceUrl).hostname}</a></span>
        ))}
      </p>
    </section>
  );
}
