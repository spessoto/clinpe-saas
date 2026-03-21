import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-pododesk-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PodoDesk | Gestão Integrada de Dados e Pacientes",
  description: "Plataforma SaaS para gestão de podologia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
