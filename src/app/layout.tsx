import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { getLanguage } from "@/lib/i18n/getDictionary";

// Note: using a system font stack for now instead of next/font/google —
// avoids a build-time dependency on fonts.googleapis.com. Swap in
// Noto Sans Thai / IBM Plex Sans Thai (self-hosted) when polishing visuals.

export const metadata: Metadata = {
  title: "Wedding Management System — KS Wedding",
  description: "Personal wedding management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLanguage();

  return (
    <html lang={lang} className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-sky-50 text-base text-slate-800">
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
