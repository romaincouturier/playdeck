import type { Metadata } from "next";
import "./globals.css";

import { I18nProvider } from "@/lib/i18n/i18n-context";

export const metadata: Metadata = {
  title: "PlayDeck - Gestionnaire de Decks de Cartes",
  description: "Gérez vos decks de cartes en ligne avec PlayDeck",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body className="antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
