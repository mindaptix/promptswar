"use client";

import { useEffect, useSyncExternalStore } from "react";

type Language = "en" | "hi";
const key = "promptswar-language";
const eventName = "promptswar-language-change";
let fallback: Language = "en";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(eventName, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(eventName, listener);
  };
}

function getSnapshot(): Language {
  try {
    return window.localStorage.getItem(key) === "hi" ? "hi" : "en";
  } catch {
    return fallback;
  }
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getSnapshot, () => "en" as Language);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "hi" ? "गिग वर्कर साथी" : "Gig Worker Companion";
  }, [language]);

  function setHindi(hindi: boolean) {
    fallback = hindi ? "hi" : "en";
    try {
      window.localStorage.setItem(key, fallback);
    } catch {
      // Language selection remains available when browser storage is disabled.
    }
    window.dispatchEvent(new Event(eventName));
  }

  return { hindi: language === "hi", setHindi, language };
}
