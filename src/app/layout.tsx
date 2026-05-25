import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { HeadScriptsLoader } from "@/components/head-scripts";
import { getActiveHeadScripts } from "@/app/admin/settings/actions";
import { getAppUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-pododesk-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PodoDesk | Gestão Integrada de Dados e Pacientes",
  description: "Plataforma SaaS para gestão de podologia",
  metadataBase: new URL(getAppUrl()),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "PodoDesk",
    title: "PodoDesk | Gestão Integrada de Dados e Pacientes",
    description: "Plataforma SaaS para gestão de podologia",
    images: [
      {
        url: "/sys_pododesk.png",
        width: 1200,
        height: 630,
        alt: "PodoDesk",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PodoDesk | Gestão Integrada de Dados e Pacientes",
    description: "Plataforma SaaS para gestão de podologia",
    images: ["/sys_pododesk.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headScripts = await getActiveHeadScripts();
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <CookieConsentBanner />
          {headScripts.length > 0 && (
            <HeadScriptsLoader scripts={headScripts} />
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
