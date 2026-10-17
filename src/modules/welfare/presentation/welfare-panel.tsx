"use client";

import { useState } from "react";
import { Icon } from "@/shared/ui/icon";
import { assessSchemes, type CriterionCheck, type WelfareNeed } from "@/modules/welfare/domain/schemes";
import styles from "@/shared/ui/panel.module.css";

type Props = { hindi: boolean };

const needLabels: Record<WelfareNeed, [string, string]> = {
  registration: ["Worker registration", "श्रमिक पंजीकरण"],
  pension: ["Pension", "पेंशन"],
  health: ["Health cover", "स्वास्थ्य सुरक्षा"],
  insurance: ["Life or accident insurance", "जीवन या दुर्घटना बीमा"],
};

const resultLabels: Record<CriterionCheck["result"], [string, string]> = {
  matches_listed: ["Your answer matches", "आपका जवाब मेल खाता है"],
  outside_listed: ["Your answer is outside this", "आपका जवाब इससे बाहर है"],
  not_answered: ["Not answered", "जवाब नहीं दिया"],
  check_yourself: ["Check yourself", "खुद जांचें"],
};

const parseAnswer = (value: string) => (value.trim() === "" ? null : Number(value));

export function WelfarePanel({ hindi }: Props) {
  const language = hindi ? "hi" : "en";
  const t = (en: string, hi: string) => (hindi ? hi : en);
  const [needs, setNeeds] = useState<WelfareNeed[]>([]);
  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const results = assessSchemes(needs, { age: parseAnswer(age), monthlyIncome: parseAnswer(income) });

  const toggle = (need: WelfareNeed) => setNeeds((current) => (current.includes(need) ? current.filter((item) => item !== need) : [...current, need]));

  return (
    <section id="welfare" className={styles.panel} aria-labelledby="welfare-title">
      <div className={styles.header}>
        <span className={styles.icon}><Icon name="bag" size={20} /></span>
        <div>
          <h2 id="welfare-title">{t("Government schemes", "सरकारी योजनाएं")}</h2>
          <p>{t("Official schemes and portals, with links to the government source. This app cannot tell you whether you are eligible; only the official source can confirm that.", "आधिकारिक योजनाएं और पोर्टल, सरकारी स्रोत के लिंक के साथ। यह ऐप नहीं बता सकता कि आप पात्र हैं या नहीं; यह सिर्फ़ आधिकारिक स्रोत ही पक्का कर सकता है।")}</p>
        </div>
      </div>

      <fieldset className={styles.options}>
        <legend>{t("What are you looking for? (optional)", "आप क्या ढूंढ रहे हैं? (वैकल्पिक)")}</legend>
        {(Object.keys(needLabels) as WelfareNeed[]).map((need) => (
          <label key={need} className={styles.option}>
            <input type="checkbox" checked={needs.includes(need)} onChange={() => toggle(need)} />
            {hindi ? needLabels[need][1] : needLabels[need][0]}
          </label>
        ))}
      </fieldset>

      <div className={styles.fields}>
        <label className={styles.field}>{t("Your age (optional)", "आपकी उम्र (वैकल्पिक)")}<input type="number" inputMode="numeric" min={0} max={120} value={age} onChange={(event) => setAge(event.target.value)} /></label>
        <label className={styles.field}>{t("Monthly income in ₹ (optional)", "मासिक आय ₹ में (वैकल्पिक)")}<input type="number" inputMode="numeric" min={0} value={income} onChange={(event) => setIncome(event.target.value)} /></label>
      </div>
      <p className={styles.hint}>{t("Answers stay on this device and are only compared with criteria printed on the official page.", "जवाब इसी डिवाइस पर रहते हैं और सिर्फ़ आधिकारिक पेज पर लिखी शर्तों से मिलाए जाते हैं।")}</p>

      <ul className={styles.grid} aria-live="polite" aria-label={t("Schemes", "योजनाएं")}>
        {results.map(({ scheme, checks }) => (
          <li key={scheme.id} className={styles.card}>
            <h3>{scheme.name[language]}</h3>
            <p>{scheme.about[language]}</p>
            <p className={styles.unknown}>{t("Eligibility: not confirmed. Check on the official site.", "पात्रता: पक्की नहीं। आधिकारिक साइट पर जांचें।")}</p>
            {checks.length > 0 && (
              <>
                <p><strong>{t("Listed on the official page:", "आधिकारिक पेज पर लिखा है:")}</strong></p>
                <ul className={styles.checks}>
                  {checks.map((check, index) => (
                    <li key={index}><span className={styles.badge} data-result={check.result}>{hindi ? resultLabels[check.result][1] : resultLabels[check.result][0]}</span>{check.text[language]}</li>
                  ))}
                </ul>
                {checks.some((check) => check.result === "outside_listed") && (
                  <p className={styles.hint}>{t("An answer is outside a listed criterion. Rules can change or have exceptions, so confirm with the official source.", "एक जवाब लिखी शर्त से बाहर है। नियम बदल सकते हैं या अपवाद हो सकते हैं, इसलिए आधिकारिक स्रोत से पक्का करें।")}</p>
                )}
              </>
            )}
            {scheme.sourceFacts.length > 0 && <ul>{scheme.sourceFacts.map((fact, index) => <li key={index}>{fact[language]}</li>)}</ul>}
            <p className={styles.source}>
              <a className={styles.link} href={scheme.source.url} target="_blank" rel="noopener noreferrer">{scheme.source.label}</a>
              {" · "}{scheme.source.publisher[language]}{" · "}
              {t("reviewed", "समीक्षा")} {new Date(`${scheme.source.reviewedOn}T00:00:00`).toLocaleDateString(hindi ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {scheme.helpline && <> · <a className={styles.link} href={`tel:${scheme.helpline}`}>{t("Helpline", "हेल्पलाइन")} {scheme.helpline}</a></>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
