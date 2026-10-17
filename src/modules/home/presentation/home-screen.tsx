"use client";

import Link from "next/link";
import { BrandMark } from "@/shared/ui/brand-mark";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon, type IconName } from "@/shared/ui/icon";
import { useLanguage } from "@/shared/i18n/use-language";
import styles from "./home-screen.module.css";

type Entry = { id: string; income: number; expense: number; time: string };


export function HomeScreen({ displayName }: { displayName: string }) {
  const { hindi, setHindi } = useLanguage();
  const locale = hindi ? "hi-IN-u-nu-deva" : "en-IN";
  const money = (paise: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entryStatus, setEntryStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const t = (en: string, hi: string) => hindi ? hi : en;
  const income = entries.reduce((sum, entry) => sum + entry.income, 0);
  const expense = entries.reduce((sum, entry) => sum + entry.expense, 0);

  useEffect(() => {
    fetch("/api/earnings").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      setSignedIn(true);
      setEntries(data.entries || []);
    });
  }, []);

  function selectQuestion(value: string) {
    setQuestion(value);
    setAiStatus("");
    questionRef.current?.focus();
    document.getElementById("assistant")?.scrollIntoView({ behavior: "instant", block: "center" });
  }

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const earned = Number(data.get("income"));
    const spent = Number(data.get("expense") || 0);
    if (![earned, spent].every((value) => Number.isFinite(value) && value >= 0 && value <= 1000000) || earned + spent === 0) {
      setEntryStatus(t("Enter at least one amount above ₹0 (up to ₹10,00,000 per field).", "कम से कम एक राशि ₹0 से अधिक भरें (हर फ़ील्ड में अधिकतम ₹10,00,000)।"));
      return;
    }
    fetch("/api/earnings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ income: earned, expense: spent }) }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) { setEntryStatus(result.error || t("Unable to save entry.", "एंट्री सेव नहीं हो सकी।")); return; }
      setEntries((previous) => [{ id: result.id, income: Math.round(earned * 100), expense: Math.round(spent * 100), time: new Date().toISOString() }, ...previous]);
      setSignedIn(true);
      setEntryStatus(t("Entry saved to your account.", "एंट्री आपके अकाउंट में सेव हो गई।"));
      form.reset();
    });
  }

  const actions: { icon: IconName; title: string; description: string; prompt: string; color: string }[] = [
    { icon: "document", title: t("Draft a complaint", "शिकायत लिखें"), description: t("Find the words for your work-related issue.", "अपनी काम से जुड़ी समस्या लिखें।"), prompt: t("Help me draft a complaint about an unpaid payment.", "रुकी हुई पेमेंट की शिकायत लिखने में मदद करें।"), color: "blue" },
    { icon: "bag", title: t("Explore schemes", "योजनाएं देखें"), description: t("Understand support available for your work.", "अपने काम से जुड़ी योजनाएं समझें।"), prompt: t("How can I find verified welfare schemes for my work?", "मेरे काम से जुड़ी सत्यापित कल्याण योजनाएं कैसे खोजूं?"), color: "purple" },
    { icon: "wallet", title: t("Document help", "दस्तावेज़ों में मदद"), description: t("Make sense of paperwork, one step at a time.", "ज़रूरी कागज़ात और अगले कदम समझें।"), prompt: t("Help me prepare a document checklist for an application.", "आवेदन के लिए दस्तावेज़ों की चेकलिस्ट बनाने में मदद करें।"), color: "orange" },
    { icon: "shield", title: t("Safety & rights", "सुरक्षा और अधिकार"), description: t("Be informed and feel more prepared.", "जानकारी के साथ काम के लिए तैयार रहें।"), prompt: t("Help me understand safety practices and rights for my work.", "मेरे काम की सुरक्षा और अधिकारों को समझने में मदद करें।"), color: "teal" },
  ];

  return (
    <div className={styles.shell} lang={hindi ? "hi" : "en"}>
      <a className={styles.skip} href="#main">{t("Skip to content", "मुख्य सामग्री पर जाएं")}</a>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><span className={styles.brandIcon}><BrandMark /></span><span>{t("Gig Worker", "गिग वर्कर")}<br />{t("Companion", "साथी")}<span className={styles.brandCaption}>{t("A LITTLE SUPPORT. EVERY DAY.", "हर दिन। थोड़ा और साथ।")}</span></span></Link>
        <p className={styles.navLabel}>{t("YOUR WORKSPACE", "आपका कार्यक्षेत्र")}</p>
        <nav className={styles.nav} aria-label={t("Main navigation", "मुख्य नेविगेशन")}>
          <a href="#main" className={styles.active} aria-current="page"><Icon name="home" />{t("Home", "होम")}<span className={styles.activeDot} /></a>
          <a href="#earnings"><Icon name="chart" />{t("Earnings", "कमाई")}</a>
          <a href="#assistant"><Icon name="chat" />{t("AI Assistant", "एआई सहायक")}<span className={styles.aiBadge}>{t("AI", "एआई")}</span></a>
          {actions.slice(1, 3).map((action) => <button key={action.color} onClick={() => selectQuestion(action.prompt)}><Icon name={action.icon} />{action.title}</button>)}
          <button onClick={() => selectQuestion(actions[0].prompt)}><Icon name="document" />{t("Complaints", "शिकायतें")}</button>
        </nav>
        <div className={styles.sidebarTip}><span className={styles.tipIcon}><Icon name="spark" /></span><h2>{t("A little help goes a long way.", "थोड़ी मदद, बड़ा साथ।")}</h2><p>{t("Your questions deserve simple answers, in your language.", "आपके सवालों के आसान जवाब, आपकी भाषा में।")}</p><a href="#assistant">{t("Meet your assistant", "अपने सहायक से मिलें")}<Icon name="arrow" size={16} /></a></div>
        <Link href="/login" className={styles.account}><span className={styles.avatar}><Icon name="user" size={20} /></span><span><strong>{displayName}</strong><small>{t("Signed in", "लॉग इन है")}</small></span><Icon name="chevron" size={16} /></Link>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <span className={styles.breadcrumb}>{t("Your workspace", "आपका कार्यक्षेत्र")}<span>/</span><strong>{t("Overview", "एक नज़र में")}</strong></span>
          <span className={styles.mobileBrand}><Icon name="spark" size={20} />{t("Gig Worker Companion", "गिग वर्कर साथी")}</span>
          <div className={styles.topbarActions}><div className={styles.languages}><Icon name="globe" size={17} /><button aria-pressed={hindi} onClick={() => { setHindi(true); setAiStatus(""); setEntryStatus(""); }}>हिन्दी</button><span /><button aria-pressed={!hindi} onClick={() => { setHindi(false); setAiStatus(""); setEntryStatus(""); }}>English</button></div><Link href="/login" className={styles.topAvatar} aria-label={t("Sign in", "लॉग इन")}><Icon name="user" size={19} /></Link></div>
        </header>
        <main id="main" className={styles.content}>
          <section className={styles.greeting}><div><p className={styles.eyebrow}>{t("LET’S MAKE TODAY A LITTLE EASIER", "आज का काम, थोड़ा आसान")}</p><h1>{t(`Hello, ${displayName}`, `नमस्ते, ${displayName}`)}<span className={styles.greetingDot}>.</span></h1><p>{t("Your workday, with a little more support.", "आपके हर काम में, थोड़ा और साथ।")}</p></div><a href="#earnings" className={styles.outlineButton}><Icon name="plus" size={17} />{t("Add today's entry", "आज की एंट्री जोड़ें")}</a></section>
          <section className={styles.stats} aria-label={t("Session earnings summary", "सेशन में कमाई का हिसाब")}>
            {([
              ["wallet", t("Earnings", "कमाई"), income, "teal", t("Income you have added", "आपकी जोड़ी हुई कमाई")],
              ["bag", t("Expenses", "खर्च"), expense, "rose", t("Fuel, food and other costs", "पेट्रोल, खाना और अन्य खर्च")],
              ["chart", t("Net earnings", "शुद्ध कमाई"), income - expense, "green", t("Your income minus expenses", "कमाई में से खर्च घटाकर")],
            ] as [IconName, string, number, string, string][]).map(([icon, label, value, color, detail]) => <article className={`${styles.stat} ${styles[color]}`} key={color}><div className={styles.statTop}><span>{label}</span><span className={styles.statIcon}><Icon name={icon} size={20} /></span></div><strong>{money(value)}</strong><p>{detail}</p></article>)}
          </section>
          <div className={styles.primaryGrid}>
            <section id="assistant" className={styles.assistant}>
              <div className={styles.assistantHeading}><span className={styles.assistantIcon}><Icon name="chat" size={23} /></span><span className={styles.assistantLabel}>{t("YOUR AI ASSISTANT", "आपका एआई सहायक")}</span><span className={styles.previewTag}>{t("Preview", "पूर्वावलोकन")}</span></div>
              <h2>{t("What can I help you with?", "आज किस चीज़ में मदद चाहिए?")}</h2><p>{t("Big question or small worry. Start in your own words.", "छोटा सवाल हो या बड़ी चिंता, अपनी भाषा में पूछें।")}</p>
              <form className={styles.composer} onSubmit={async (event) => { event.preventDefault(); if (!question.trim()) return; setAiStatus(t("Thinking…", "सोच रहा हूं…")); const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }); const result = await response.json(); setAiStatus(response.ok ? result.answer : result.error); }}>
                <label className={styles.srOnly} htmlFor="question">{t("Your question", "आपका सवाल")}</label><textarea id="question" ref={questionRef} value={question} onChange={(event) => { setQuestion(event.target.value); setAiStatus(""); }} placeholder={t("Type your question here…", "अपना सवाल यहां लिखें…")} rows={2} maxLength={2000} required /><button type="submit" disabled={!question.trim()} aria-label={t("Send question", "सवाल भेजें")}><Icon name="send" size={20} /></button>
              </form>
              <div className={styles.suggestions}>{[t("Payment not received", "पेमेंट नहीं मिली"), t("Find a scheme", "योजना की जानकारी"), t("Document help", "दस्तावेज़ों में मदद")].map((label, index) => <button key={label} onClick={() => selectQuestion(actions[index].prompt)}>{label}<Icon name="plus" size={12} /></button>)}</div>
              <p className={styles.aiStatus} role="status">{aiStatus || t("Ask a question and get a real AI response.", "सवाल पूछें और एआई से जवाब पाएं।")}</p>
            </section>
            <section id="earnings" className={styles.entryCard}><div className={styles.sectionTitle}><span className={styles.smallPlus}><Icon name="plus" size={17} /></span><h2>{t("Add an entry", "कमाई जोड़ें")}</h2></div><p className={styles.cardDescription}>{t("A small habit. A clearer picture.", "छोटी आदत, साफ़ हिसाब।")}</p><form onSubmit={addEntry} onChange={() => setEntryStatus("")}><label htmlFor="income">{t("Income", "कमाई")} <span>₹</span></label><input id="income" name="income" type="number" inputMode="decimal" min="0" max="1000000" step="0.01" placeholder="0.00" required /><label htmlFor="expense">{t("Expenses", "खर्च")} <span>₹</span></label><input id="expense" name="expense" type="number" inputMode="decimal" min="0" max="1000000" step="0.01" placeholder="0.00" /><button className={styles.saveButton} type="submit"><Icon name="plus" size={17} />{t("Add entry", "एंट्री जोड़ें")}</button></form><p role="status" className={styles.entryStatus}>{entryStatus || (signedIn ? t("Saved to your account.", "आपके अकाउंट में सेव होगा।") : t("Sign in to save entries across devices.", "अलग-अलग डिवाइस पर सेव करने के लिए लॉग इन करें।"))}</p></section>
          </div>
          <section className={styles.helpSection}><div className={styles.sectionHeader}><h2>{t("A little help, wherever you need it", "जहां ज़रूरत, वहां मदद")}</h2><span>{t("START WITH A QUESTION", "एक सवाल से शुरुआत")}</span></div><div className={styles.actionGrid}>{actions.map((action) => <button key={action.color} className={styles.actionCard} onClick={() => selectQuestion(action.prompt)}><div className={styles.actionTop}><span className={`${styles.actionIcon} ${styles[action.color]}`}><Icon name={action.icon} size={22} /></span><Icon name="chevron" size={16} /></div><h3>{action.title}</h3><p>{action.description}</p></button>)}</div></section>
          <section className={styles.activity}><div className={styles.sectionHeader}><h2>{t("Recent activity", "हाल की गतिविधि")}</h2><span>{new Intl.NumberFormat(locale).format(entries.length)} {t("ENTRIES THIS SESSION", "एंट्री इस सेशन में")}</span></div>{entries.length === 0 ? <div className={styles.emptyActivity}><span><Icon name="wallet" size={25} /></span><div><h3>{t("A fresh start for your workday", "आपके दिन की नई शुरुआत")}</h3><p>{t("Add your first entry and see your earnings take shape here.", "पहली एंट्री जोड़ें और यहां अपनी कमाई का हिसाब देखें।")}</p></div><a href="#earnings">{t("Add entry", "एंट्री जोड़ें")}<Icon name="arrow" size={16} /></a></div> : <ul className={styles.activityList}>{entries.map((entry) => <li key={entry.id}><span className={styles.activityIcon}><Icon name="check" size={19} /></span><div><h3>{t("Earnings entry added", "कमाई की एंट्री जुड़ी")}</h3><p>{t("Income", "कमाई")} {money(entry.income)} <span>·</span> {t("Expenses", "खर्च")} {money(entry.expense)}</p></div><div className={styles.activityAmount}><strong>{money(entry.income - entry.expense)}</strong><small>{new Date(entry.time).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false })}</small></div></li>)}</ul>}</section>
          <footer className={styles.footer}><span><Icon name="spark" size={14} />{t("Built around your workday.", "आपके काम का साथी।")}</span><span>{t("Guest preview · Your data stays in this session", "गेस्ट प्रीव्यू · जानकारी इस सेशन तक सीमित है")}</span></footer>
        </main>
      </div>
      <nav className={styles.mobileNav} aria-label={t("Mobile navigation", "मोबाइल नेविगेशन")}><a href="#main" aria-current="page"><Icon name="home" size={21} />{t("Home", "होम")}</a><a href="#earnings"><Icon name="chart" size={21} />{t("Earnings", "कमाई")}</a><a href="#assistant"><Icon name="chat" size={21} />{t("Assistant", "सहायक")}</a><Link href="/login"><Icon name="user" size={21} />{t("Sign in", "लॉग इन")}</Link></nav>
    </div>
  );
}
