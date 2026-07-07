"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import th from "./dictionaries/th.json";
import en from "./dictionaries/en.json";

type Language = "th" | "en";
const dictionaries = { th, en };

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof th;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("th"); // Thai is the primary/default language

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
