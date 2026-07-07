import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

// Note: using a system font stack for now instead of next/font/google —
// avoids a build-time dependency on fonts.googleapis.com. Swap in
// Noto Sans Thai / IBM Plex Sans Thai (self-hosted) in Milestone 1
// per the UI/UX Design doc.

export const metadata: Metadata = {
  title: "Wedding Management System — KS Wedding",
  description: "Personal wedding management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-sky-50 text-slate-800">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
