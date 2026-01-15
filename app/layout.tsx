import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
        <SpeedInsights />
      </body>
    </html>
  );
}
