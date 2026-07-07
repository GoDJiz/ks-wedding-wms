"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import th from "./dictionaries/th.json";
import en from "./dictionaries/en.json";
import { LANG_COOKIE, type Language, type Dictionary } from "./types";
import type { ErrorCode } from "@/shared/lib/errorCodes";

const dictionaries: Record<Language, Dictionary> = { th, en };

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Dictionary;
  tError: (code: ErrorCode) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Language;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Language>(initialLang);
  const router = useRouter();

  const setLang = (next: Language) => {
    setLangState(next);
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000`;
    router.refresh(); // re-renders Server Components with the new cookie value
  };

  const t = dictionaries[lang];
  const tError = (code: ErrorCode) => t.errors[code] ?? t.errors.unknown_error;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tError }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
