import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

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
    <html lang="fr">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
