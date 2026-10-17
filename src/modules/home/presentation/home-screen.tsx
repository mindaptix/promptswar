"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Icon, type IconName } from "@/shared/ui/icon";
import { useLanguage } from "@/shared/i18n/use-language";
import { DocumentPanel } from "@/modules/documents/presentation/document-panel";
import { SafetyPanel } from "@/modules/safety/presentation/safety-panel";
import { WelfarePanel } from "@/modules/welfare/presentation/welfare-panel";
import { ComplaintPanel } from "@/modules/complaints/presentation/complaint-panel";
import { ActivityList } from "./activity-list";
import { AssistantCard } from "./assistant-card";
import { EarningsCard } from "./earnings-card";
import { useEarnings } from "./use-earnings";
import styles from "./home-screen.module.css";

type Copy = (en: string, hi: string) => string;

const tools: { href: string; icon: IconName; title: [string, string]; description: [string, string]; color: string }[] = [
  { href: "#complaints", icon: "document", title: ["Draft a complaint", "शिकायत लिखें"], description: ["Find the words for your work-related issue.", "अपनी काम से जुड़ी समस्या लिखें।"], color: "blue" },
  { href: "#welfare", icon: "bag", title: ["Explore schemes", "योजनाएं देखें"], description: ["Understand support available for your work.", "अपने काम से जुड़ी योजनाएं समझें।"], color: "purple" },
  { href: "#documents", icon: "wallet", title: ["Document help", "दस्तावेज़ों में मदद"], description: ["Make sense of paperwork, one step at a time.", "ज़रूरी कागज़ात और अगले कदम समझें।"], color: "orange" },
  { href: "#safety", icon: "shield", title: ["Safety & rights", "सुरक्षा और अधिकार"], description: ["Be informed and feel more prepared.", "जानकारी के साथ काम के लिए तैयार रहें।"], color: "teal" },
];

function Stat({ icon, label, value, color, detail }: { icon: IconName; label: string; value: string; color: string; detail: string }) {
  return (
    <article className={`${styles.stat} ${styles[color]}`}>
      <div className={styles.statTop}><span>{label}</span><span className={styles.statIcon}><Icon name={icon} size={20} /></span></div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

/** Signed-in workspace. Each tool is its own component; this file only arranges them. */
export function HomeScreen({ displayName }: { displayName: string }) {
  const router = useRouter();
  const { hindi, setHindi } = useLanguage();
  const [activeView, setActiveView] = useState<"home" | "assistant">("home");
  const [loggingOut, setLoggingOut] = useState(false);
  const t: Copy = (en, hi) => (hindi ? hi : en);
  const locale = hindi ? "hi-IN-u-nu-deva" : "en-IN";
  const money = (paise: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
  const earnings = useEarnings(t);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className={styles.shell} lang={hindi ? "hi" : "en"} data-view={activeView}>
      <a className={styles.skip} href="#main">{t("Skip to content", "मुख्य सामग्री पर जाएं")}</a>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon}><BrandMark /></span>
          <span>{t("Gig Worker", "गिग वर्कर")}<br />{t("Companion", "साथी")}<span className={styles.brandCaption}>{t("A LITTLE SUPPORT. EVERY DAY.", "हर दिन। थोड़ा और साथ।")}</span></span>
        </Link>
        <p className={styles.navLabel}>{t("YOUR WORKSPACE", "आपका कार्यक्षेत्र")}</p>
        <nav className={styles.nav} aria-label={t("Main navigation", "मुख्य नेविगेशन")}>
          <a href="#main" onClick={() => setActiveView("home")} className={activeView === "home" ? styles.active : undefined} aria-current={activeView === "home" ? "page" : undefined}><Icon name="home" />{t("Home", "होम")}{activeView === "home" && <span className={styles.activeDot} />}</a>
          <a href="#earnings" onClick={() => setActiveView("home")}><Icon name="chart" />{t("Earnings", "कमाई")}</a>
          <a href="#assistant" onClick={() => setActiveView("assistant")} className={activeView === "assistant" ? styles.active : undefined} aria-current={activeView === "assistant" ? "page" : undefined}><Icon name="chat" />{t("AI Assistant", "एआई सहायक")}<span className={styles.aiBadge}>{t("AI", "एआई")}</span></a>
          <a href="#documents" onClick={() => setActiveView("home")}><Icon name="document" />{t("Understand a document", "दस्तावेज़ समझें")}</a>
          <a href="#complaints" onClick={() => setActiveView("home")}><Icon name="document" />{t("Complaints", "शिकायतें")}</a>
          <a href="#welfare" onClick={() => setActiveView("home")}><Icon name="bag" />{t("Government schemes", "सरकारी योजनाएं")}</a>
          <a href="#safety" onClick={() => setActiveView("home")}><Icon name="shield" />{t("Safety help", "सुरक्षा मदद")}</a>
        </nav>
        <div className={styles.sidebarTip}>
          <span className={styles.tipIcon}><Icon name="spark" /></span>
          <h2>{t("A little help goes a long way.", "थोड़ी मदद, बड़ा साथ।")}</h2>
          <p>{t("Your questions deserve simple answers, in your language.", "आपके सवालों के आसान जवाब, आपकी भाषा में।")}</p>
          <a href="#assistant" onClick={() => setActiveView("assistant")}>{t("Meet your assistant", "अपने सहायक से मिलें")}<Icon name="arrow" size={16} /></a>
        </div>
        <button type="button" className={styles.account} onClick={logout} disabled={loggingOut}>
          <span className={styles.avatar}><Icon name="user" size={20} /></span>
          <span><strong>{displayName}</strong><small>{loggingOut ? t("Signing out…", "लॉग आउट हो रहा है…") : t("Logout", "लॉग आउट")}</small></span>
          <Icon name="chevron" size={16} />
        </button>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <span className={styles.breadcrumb}>{t("Your workspace", "आपका कार्यक्षेत्र")}<span>/</span><strong>{activeView === "assistant" ? t("AI Assistant", "एआई सहायक") : t("Overview", "एक नज़र में")}</strong></span>
          <span className={styles.mobileBrand}><Icon name="spark" size={20} />{t("Gig Worker Companion", "गिग वर्कर साथी")}</span>
          <div className={styles.topbarActions}>
            <div className={styles.languages} role="group" aria-label={t("Language", "भाषा")}>
              <Icon name="globe" size={17} />
              <button type="button" aria-pressed={hindi} onClick={() => setHindi(true)}>हिन्दी</button>
              <span />
              <button type="button" aria-pressed={!hindi} onClick={() => setHindi(false)}>English</button>
            </div>
            <button type="button" className={styles.topAvatar} onClick={logout} disabled={loggingOut} aria-label={t("Logout", "लॉग आउट")}><Icon name="user" size={19} /></button>
          </div>
        </header>
        <main id="main" className={styles.content}>
          <section className={styles.greeting}>
            <div>
              <p className={styles.eyebrow}>{t("LET’S MAKE TODAY A LITTLE EASIER", "आज का काम, थोड़ा आसान")}</p>
              <h1>{t(`Hello, ${displayName}`, `नमस्ते, ${displayName}`)}<span className={styles.greetingDot}>.</span></h1>
              <p>{t("Your workday, with a little more support.", "आपके हर काम में, थोड़ा और साथ।")}</p>
            </div>
            <a href="#earnings" className={styles.outlineButton}><Icon name="plus" size={17} />{t("Add today's entry", "आज की एंट्री जोड़ें")}</a>
          </section>
          <section className={styles.stats} aria-label={t("Earnings summary", "कमाई का हिसाब")}>
            <Stat icon="wallet" color="teal" label={t("Earnings", "कमाई")} value={money(earnings.income)} detail={t("Income you have added", "आपकी जोड़ी हुई कमाई")} />
            <Stat icon="bag" color="rose" label={t("Expenses", "खर्च")} value={money(earnings.expense)} detail={t("Fuel, food and other costs", "पेट्रोल, खाना और अन्य खर्च")} />
            <Stat icon="chart" color="green" label={t("Net earnings", "शुद्ध कमाई")} value={money(earnings.income - earnings.expense)} detail={t("Your income minus expenses", "कमाई में से खर्च घटाकर")} />
          </section>
          <div className={styles.primaryGrid}>
            <AssistantCard hindi={hindi} t={t} />
            <EarningsCard t={t} earnings={earnings} />
          </div>
          <DocumentPanel hindi={hindi} />
          <ComplaintPanel hindi={hindi} />
          <WelfarePanel hindi={hindi} />
          <SafetyPanel hindi={hindi} onDraftComplaint={(category) => window.dispatchEvent(new CustomEvent("draft-complaint", { detail: category }))} />
          <section className={styles.helpSection}>
            <div className={styles.sectionHeader}>
              <h2>{t("A little help, wherever you need it", "जहां ज़रूरत, वहां मदद")}</h2>
              <span>{t("OPEN THE TOOL", "टूल खोलें")}</span>
            </div>
            <div className={styles.actionGrid}>
              {tools.map((tool) => (
                <a key={tool.href} href={tool.href} className={styles.actionCard}>
                  <div className={styles.actionTop}><span className={`${styles.actionIcon} ${styles[tool.color]}`}><Icon name={tool.icon} size={22} /></span><Icon name="chevron" size={16} /></div>
                  <h3>{t(tool.title[0], tool.title[1])}</h3>
                  <p>{t(tool.description[0], tool.description[1])}</p>
                </a>
              ))}
            </div>
          </section>
          <ActivityList t={t} entries={earnings.entries} money={money} locale={locale} />
          <footer className={styles.footer}>
            <span><Icon name="spark" size={14} />{t("Built around your workday.", "आपके काम का साथी।")}</span>
            <span>{t("Your entries stay on your account.", "एंट्री आपके अकाउंट में रहती हैं।")}</span>
          </footer>
        </main>
      </div>
      <nav className={styles.mobileNav} aria-label={t("Mobile navigation", "मोबाइल नेविगेशन")}>
        <a href="#main" onClick={() => setActiveView("home")} aria-current={activeView === "home" ? "page" : undefined}><Icon name="home" size={21} />{t("Home", "होम")}</a>
        <a href="#earnings" onClick={() => setActiveView("home")}><Icon name="chart" size={21} />{t("Earnings", "कमाई")}</a>
        <a href="#assistant" onClick={() => setActiveView("assistant")} aria-current={activeView === "assistant" ? "page" : undefined}><Icon name="chat" size={21} />{t("Assistant", "सहायक")}</a>
        <button type="button" onClick={logout} disabled={loggingOut}><Icon name="user" size={21} />{t("Logout", "लॉग आउट")}</button>
      </nav>
    </div>
  );
}
