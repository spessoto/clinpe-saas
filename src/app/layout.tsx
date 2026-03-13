import type { Metadata } from "next";
import { Nunito, Source_Code_Pro } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-podoclin-sans",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-podoclin-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PodoClin SaaS",
  description: "Plataforma SaaS para gestao de podologia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${nunito.variable} ${sourceCodePro.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
