"use client";

import Link from "next/link";
import { useLanguage } from "@/shared/i18n/use-language";
import { useState, type FormEvent } from "react";

type IconName = "spark" | "wallet" | "shield" | "file" | "arrow" | "mail" | "lock" | "eye";
function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /></>,
    wallet: <><path d="M20 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7" /><path d="M20 12h-5v4h5" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    file: <><path d="M14 3H5v18h14V8Z" /><path d="M14 3v5h5M8 12h8M8 16h5" /></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function LoginScreen() {
  const { hindi, setHindi } = useLanguage();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus(hindi ? "कृपया प्रतीक्षा करें…" : "Please wait…");
    const response = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
    const result = await response.json();
    if (!response.ok) { setStatus(result.error || (hindi ? "कुछ गलत हो गया।" : "Something went wrong.")); return; }
    window.location.href = "/";
  }
  return (
    <main className="login-page" lang={hindi ? "hi" : "en"}>
      <section className="story-panel" aria-label={hindi ? "गिग वर्कर साथी" : "Gig Worker Companion"}>
        <Link className="brand" href="/" aria-label={hindi ? "गिग वर्कर साथी होम" : "Gig Worker Companion home"}><span className="brand-symbol"><Icon name="spark" size={26} /></span><span>{hindi ? "गिग वर्कर" : "Gig Worker"}<span className="brand-second">{hindi ? "साथी" : "Companion"}</span></span></Link>
        <div className="story-content">
          <span className="eyebrow"><span /> {hindi ? "आपकी मेहनत का साथी" : "YOUR EVERYDAY WORK COMPANION"}</span>
          <h1>{hindi ? <>आप मेहनत करें।<br /><em>बाकी साथ संभालेंगे।</em></> : <>You work hard.<br /><em>Let’s make it easier.</em></>}</h1>
          <p className="story-intro">{hindi ? "कमाई का हिसाब, ज़रूरी जानकारी और एआई की मदद — सब एक जगह, आपकी भाषा में।" : "Your earnings, your questions, your next step. A little support for everything your workday brings."}</p>
          <div className="feature-list">
            {([
              ["wallet", hindi ? "अपनी कमाई समझें" : "Make every rupee count", hindi ? "कमाई और खर्च का आसान हिसाब।" : "Keep your earnings and expenses in one place."],
              ["spark", hindi ? "अपनी भाषा में मदद पाएं" : "Get help in your language", hindi ? "एआई से पूछें, आसान जवाब पाएं।" : "Ask your AI companion, without the jargon."],
              ["file", hindi ? "अगला कदम आसान बनाएं" : "Take the next step with confidence", hindi ? "दस्तावेज़, योजनाओं और शिकायतों में मदद।" : "Find guidance for documents, schemes and complaints."],
            ] as [IconName, string, string][]).map(([icon, title, detail]) => <div className="feature" key={icon}><span className="feature-icon"><Icon name={icon} /></span><div><h2>{title}</h2><p>{detail}</p></div></div>)}
          </div>
          <div className="worker-note"><span className="note-line" /><p>{hindi ? "डिलीवरी पार्टनर, ड्राइवर और रोज़ मेहनत करने वाले हर साथी के लिए।" : "For delivery partners, drivers, and everyone who keeps the everyday moving."}</p></div>
        </div>
        <div className="story-footer"><span>{hindi ? "आपके काम का साथी" : "BUILT AROUND YOUR WORKDAY"}</span><span className="footer-mark">✦</span></div>
      </section>

      <section className="form-panel" aria-label={hindi ? "लॉग इन" : "Sign in"}>
        <div className="language-switch" aria-label={hindi ? "भाषा" : "Language"}><button type="button" aria-pressed={hindi} onClick={() => {setHindi(true); setStatus("");}}>हिन्दी</button><span /><button type="button" aria-pressed={!hindi} onClick={() => {setHindi(false); setStatus("");}}>English</button></div>
        <div className="form-content" lang={hindi ? "hi" : "en"}>
          <div className="welcome-icon"><Icon name="spark" size={30} /></div>
          <p className="form-eyebrow">{hindi ? "आपका अपना साथी" : "YOUR DAY. A LITTLE SIMPLER."}</p>
          <h2>{mode === "login" ? (hindi ? "फिर से स्वागत है।" : "Welcome back.") : (hindi ? "अपना खाता बनाएं।" : "Create your account.")}</h2>
          <p className="form-description">{mode === "login" ? (hindi ? "अपने साथी से जुड़ने के लिए लॉग इन करें।" : "Sign in to your everyday companion.") : (hindi ? "अपना काम आसान बनाने के लिए शुरुआत करें।" : "Start making your workday a little easier.")}</p>
          <form onSubmit={submit} onChange={() => setStatus("")}>
            <label htmlFor="email">{hindi ? "ईमेल एड्रेस" : "Email address"}</label>
            <div className="input-wrap"><Icon name="mail" size={20} /><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></div>
            <label htmlFor="password">{hindi ? "पासवर्ड" : "Password"}</label>
          <div className="input-wrap"><Icon name="lock" size={20} /><input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder={hindi ? "अपना पासवर्ड लिखें" : "Enter your password"} required /><button className="password-toggle" type="button" aria-label={hindi ? (visible ? "पासवर्ड छिपाएं" : "पासवर्ड दिखाएं") : (visible ? "Hide password" : "Show password")} aria-pressed={visible} onClick={() => setVisible(!visible)}><Icon name="eye" size={20} /></button></div>
          <p className="form-helper">{hindi ? "अपने अकाउंट का ईमेल और पासवर्ड इस्तेमाल करें।" : "Use the email and password linked to your account."}</p>
          {mode === "login" && <p className="form-helper" style={{ marginTop: -8 }}>{hindi ? "टेस्ट लॉगिन: kartiksetia@gmail.com / promptswar" : "Evaluator test login: kartiksetia@gmail.com / promptswar"}</p>}
            <button className="sign-in" type="submit">{mode === "login" ? (hindi ? "लॉग इन करें" : "Sign in") : (hindi ? "खाता बनाएं" : "Create account")}<Icon name="arrow" size={20} /></button>
            <p className="form-status" role="status">{status}</p>
          </form>
          <button type="button" className="auth-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setStatus(""); }}>{mode === "login" ? (hindi ? "नया खाता बनाएं" : "Create a new account") : (hindi ? "पहले से खाता है? लॉग इन करें" : "Already have an account? Sign in")}</button>
          <div className="setup-note"><Icon name="shield" size={18} /><p>{hindi ? "आपका अकाउंट सुरक्षित सेशन कुकी से सुरक्षित है।" : "Your account is protected with a secure session cookie."}</p></div>
        </div>
        <footer className="form-footer">{hindi ? "आपकी मेहनत। आपका साथ।" : "A little support. A better workday."}<span>{hindi ? "गिग वर्कर साथी" : "Gig Worker Companion"}</span></footer>
      </section>
    </main>
  );
}
