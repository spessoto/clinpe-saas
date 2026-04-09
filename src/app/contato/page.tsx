import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";

import { sendContactEmail } from "./actions";

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Contato | PodoDesk",
  description:
    "Entre em contato com a equipe PodoDesk. Respondemos em até 1 dia útil.",
};

export default async function ContatoPage({ searchParams }: PageProps) {
  const { success, error } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/logo-pododesk.png"
              alt="PodoDesk"
              width={170}
              height={57}
              className="h-auto w-36 md:w-40"
              priority
            />
          </Link>

          <nav className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-600 transition hover:text-primary"
            >
              Início
            </Link>
            <Link
              href="/blog"
              className="text-sm font-semibold text-slate-600 transition hover:text-primary"
            >
              Blog
            </Link>
            <Link
              href="/contato"
              className="text-sm font-semibold text-primary transition hover:text-primary"
            >
              Contato
            </Link>
            <Link href="/sign-in" className="btn-gradient px-4 py-2 text-sm">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto mt-24 max-w-6xl px-6 py-10 md:mt-28 md:px-8 md:py-16">
        {/* Page heading */}
        <header className="mb-12 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Fale conosco
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Entre em contato
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 md:text-base">
            Tem alguma dúvida, sugestão ou precisa de suporte? Preencha o
            formulário abaixo ou use um dos nossos canais diretos. Respondemos
            em até 1 dia útil.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Contact info */}
          <aside className="space-y-8">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="mb-0.5 text-sm font-semibold text-slate-700">
                  E-mail
                </p>
                <a
                  href="mailto:master@pododesk.com.br"
                  className="text-sm text-primary hover:underline"
                >
                  master@pododesk.com.br
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="mb-0.5 text-sm font-semibold text-slate-700">
                  Telefone / WhatsApp
                </p>
                <a
                  href="tel:+5511937474389"
                  className="text-sm text-primary hover:underline"
                >
                  +55 11 93747-4389
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="mb-0.5 text-sm font-semibold text-slate-700">
                  Endereço
                </p>
                <p className="text-sm text-slate-600">
                  R. Rosa Sgreva Pignatari, 366
                  <br />
                  Jardim São Lourenço
                  <br />
                  Bragança Paulista – SP
                  <br />
                  CEP 12.908-540
                </p>
              </div>
            </div>
          </aside>

          {/* Contact form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              {success === "1" ? (
                <div className="flex flex-col items-center space-y-4 py-10 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
                    ✓
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    Mensagem enviada!
                  </h2>
                  <p className="max-w-sm text-sm text-slate-600">
                    Recebemos sua mensagem e responderemos em até 1 dia útil no
                    e-mail informado.
                  </p>
                  <Link
                    href="/contato"
                    className="btn-outline-modern mt-2 px-6 py-2 text-sm"
                  >
                    Enviar outra mensagem
                  </Link>
                </div>
              ) : (
                <form action={sendContactEmail} className="space-y-5">
                  {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {decodeURIComponent(error)}
                    </div>
                  ) : null}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="name"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Nome completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        maxLength={120}
                        autoComplete="name"
                        placeholder="Seu nome"
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        E-mail <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        maxLength={200}
                        autoComplete="email"
                        placeholder="seu@email.com"
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="subject"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Assunto <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      maxLength={200}
                      placeholder="Como podemos ajudar?"
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="message"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Mensagem <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      maxLength={4000}
                      rows={6}
                      placeholder="Descreva sua dúvida ou solicitação..."
                      className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-gradient w-full py-3 text-sm font-bold sm:w-auto sm:px-10"
                  >
                    Enviar mensagem
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 px-6 pb-12 pt-20 md:px-8 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center space-y-10 text-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Pronto para elevar o padrão da sua clínica?
              </h2>
              <Link
                href="/sign-up"
                className="btn-gradient inline-flex rounded-full px-10 py-5 text-xl font-black"
              >
                Quero testar o PodoDesk por 7 dias
              </Link>
            </div>

            <div className="grid w-full grid-cols-1 gap-10 border-t border-slate-800 pt-12 text-left md:grid-cols-4">
              <div className="space-y-4 md:col-span-1">
                <Image
                  src="/logo-pododesk-white.png"
                  alt="PodoDesk"
                  width={180}
                  height={60}
                  className="h-auto w-40"
                />
                <p className="text-sm leading-relaxed text-slate-400">
                  Gestão clínica com precisão asséptica. Desenvolvido por
                  especialistas para profissionais de alto rendimento.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="mb-4 font-bold text-white">Produto</h4>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="/#funcionalidades"
                >
                  Funcionalidades
                </a>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="/#precos"
                >
                  Preços
                </a>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/blog"
                >
                  Blog
                </Link>
              </div>

              <div className="space-y-3">
                <h4 className="mb-4 font-bold text-white">Suporte</h4>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/helpdesk"
                >
                  Central de Ajuda
                </Link>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/contato"
                >
                  Contato
                </Link>
              </div>

              <div className="space-y-3">
                <h4 className="mb-4 font-bold text-white">Legal</h4>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/termos-de-uso"
                >
                  Termos de Uso
                </Link>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/politica-de-privacidade"
                >
                  Privacidade
                </Link>
              </div>
            </div>

            <div className="flex w-full flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-sm text-slate-500 md:flex-row">
              <span>© 2024 PodoDesk. Gestão clínica com precisão asséptica.</span>
              <div className="flex gap-6">
                <a className="transition hover:text-white" href="#">
                  LinkedIn
                </a>
                <a className="transition hover:text-white" href="#">
                  Instagram
                </a>
                <a className="transition hover:text-white" href="#">
                  YouTube
                </a>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500">
              CNPJ 26.730.764/0001-26 | Nº 366 | CEP 12.908-540.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
