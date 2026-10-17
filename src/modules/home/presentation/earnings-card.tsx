"use client";

import { Icon } from "@/shared/ui/icon";
import type { useEarnings } from "./use-earnings";
import styles from "./home-screen.module.css";

type Copy = (en: string, hi: string) => string;
type EarningsState = ReturnType<typeof useEarnings>;

/** Daily income and expense form. The server stores paise and ignores any forged owner. */
export function EarningsCard({ t, earnings }: { t: Copy; earnings: EarningsState }) {
  const invalid = Boolean(earnings.status) && !earnings.saving && !earnings.status.startsWith("Entry") && !earnings.status.startsWith("एंट्री");
  return (
    <section id="earnings" className={styles.entryCard}>
      <div className={styles.sectionTitle}>
        <span className={styles.smallPlus}><Icon name="plus" size={17} /></span>
        <h2>{t("Add an entry", "कमाई जोड़ें")}</h2>
      </div>
      <p className={styles.cardDescription}>{t("A small habit. A clearer picture.", "छोटी आदत, साफ़ हिसाब।")}</p>
      <form onSubmit={earnings.addEntry} onChange={() => earnings.setStatus("")}>
        <label htmlFor="income">{t("Income", "कमाई")} <span>₹</span></label>
        <input id="income" name="income" type="number" inputMode="decimal" min="0" max="1000000" step="0.01" placeholder="0.00" required aria-invalid={invalid || undefined} aria-describedby="entry-status" disabled={earnings.saving} />
        <label htmlFor="expense">{t("Expenses", "खर्च")} <span>₹</span></label>
        <input id="expense" name="expense" type="number" inputMode="decimal" min="0" max="1000000" step="0.01" placeholder="0.00" aria-invalid={invalid || undefined} aria-describedby="entry-status" disabled={earnings.saving} />
        <button className={styles.saveButton} type="submit" disabled={earnings.saving} aria-busy={earnings.saving}>
          {earnings.saving ? t("Saving…", "सेव हो रहा है…") : t("Add entry", "एंट्री जोड़ें")}
        </button>
      </form>
      <p id="entry-status" role={invalid ? "alert" : "status"} aria-live="polite" className={styles.entryStatus}>
        {earnings.status || (earnings.signedIn ? t("Saved to your account.", "आपके अकाउंट में सेव होगा।") : t("Sign in to save entries across devices.", "अलग-अलग डिवाइस पर सेव करने के लिए लॉग इन करें।"))}
      </p>
    </section>
  );
}
