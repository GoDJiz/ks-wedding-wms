import { cookies } from "next/headers";
import th from "./dictionaries/th.json";
import en from "./dictionaries/en.json";
import { LANG_COOKIE, type Language, type Dictionary } from "./types";

const dictionaries: Record<Language, Dictionary> = { th, en };

export async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LANG_COOKIE)?.value;
  return value === "en" ? "en" : "th"; // Thai is the primary/default language
}

export async function getDictionary(): Promise<{
  lang: Language;
  t: Dictionary;
}> {
  const lang = await getLanguage();
  return { lang, t: dictionaries[lang] };
}

export function translateErrorCode(
  t: Dictionary,
  code: keyof Dictionary["errors"]
): string {
  return t.errors[code] ?? t.errors.unknown_error;
}
