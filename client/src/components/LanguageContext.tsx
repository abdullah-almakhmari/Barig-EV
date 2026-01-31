import React, { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

type Language = "en" | "ar";

const LANGUAGE_KEY = "bariq_language";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return (saved === "en" || saved === "ar") ? saved : "ar";
  });

  useEffect(() => {
    i18n.changeLanguage(language);
    const dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, i18n]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem(LANGUAGE_KEY, lang);
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dir: language === "ar" ? "rtl" : "ltr" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
