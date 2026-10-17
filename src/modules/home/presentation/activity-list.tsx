"use client";

import { Icon } from "@/shared/ui/icon";
import type { EarningsEntry } from "./use-earnings";
import styles from "./home-screen.module.css";

type Copy = (en: string, hi: string) => string;

/** Recent earnings rows for the signed-in user. Amounts are already in paise. */
export function ActivityList({ t, entries, money, locale }: { t: Copy; entries: EarningsEntry[]; money: (paise: number) => string; locale: string }) {
  return (
    <section className={styles.activity} aria-live="polite">
      <div className={styles.sectionHeader}>
        <h2>{t("Recent activity", "हाल की गतिविधि")}</h2>
        <span>{new Intl.NumberFormat(locale).format(entries.length)} {t("ENTRIES", "एंट्री")}</span>
      </div>
      {entries.length === 0 ? (
        <div className={styles.emptyActivity}>
          <span><Icon name="wallet" size={25} /></span>
          <div>
            <h3>{t("A fresh start for your workday", "आपके दिन की नई शुरुआत")}</h3>
            <p>{t("Add your first entry and see your earnings take shape here.", "पहली एंट्री जोड़ें और यहां अपनी कमाई का हिसाब देखें।")}</p>
          </div>
          <a href="#earnings">{t("Add entry", "एंट्री जोड़ें")}<Icon name="arrow" size={16} /></a>
        </div>
      ) : (
        <ul className={styles.activityList}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className={styles.activityIcon}><Icon name="check" size={19} /></span>
              <div>
                <h3>{t("Earnings entry added", "कमाई की एंट्री जुड़ी")}</h3>
                <p>{t("Income", "कमाई")} {money(entry.income)} <span>·</span> {t("Expenses", "खर्च")} {money(entry.expense)}</p>
              </div>
              <div className={styles.activityAmount}>
                <strong>{money(entry.income - entry.expense)}</strong>
                <small>{new Date(entry.time).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false })}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
