import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { HeadScriptsLoader } from "@/components/head-scripts";
import { getActiveHeadScripts } from "@/app/admin/settings/actions";
import "./globals.css";

const inter = Inter({
  variable: "--font-pododesk-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PodoDesk | Gestão Integrada de Dados e Pacientes",
  description: "Plataforma SaaS para gestão de podologia",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headScripts = await getActiveHeadScripts();

  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased">
        {children}
        <CookieConsentBanner />
        {headScripts.length > 0 && <HeadScriptsLoader scripts={headScripts} />}
      </body>
    </html>
  );
}
