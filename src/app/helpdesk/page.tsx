import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Helpdesk | PodoDesk",
  description:
    "Guia prático para operar o PodoDesk no dia a dia da podologia: pacientes, agenda, prontuário, financeiro e esterilização.",
};

export default function HelpdeskPage() {
  return (
    <main className="min-h-screen bg-background">
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
              href="/helpdesk"
              className="text-sm font-semibold text-primary transition hover:text-primary"
            >
              Helpdesk
            </Link>
            <Link href="/sign-in" className="btn-gradient px-4 py-2 text-sm">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto mt-24 max-w-5xl space-y-10 px-6 py-10 md:mt-28 md:px-8 md:py-14">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Helpdesk PodoDesk
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Como operar o PodoDesk sem perder tempo com gestão
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            Você terminou um atendimento, ainda precisa confirmar o próximo,
            registrar a evolução e lembrar de cobrar. Essa é a rotina real de
            quem toca o consultório. Este guia foi escrito para esse contexto,
            com orientações objetivas para usar cada função da plataforma no
            momento certo do dia.
          </p>
        </header>

        <article className="space-y-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Começo rápido: acerte a base em 20 minutos
            </h2>
            <p className="text-slate-700">
              Se você está começando agora, abra nesta ordem:
              <Link
                href="/settings"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /settings
              </Link>
              ,
              <Link
                href="/patients"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /patients
              </Link>
              e
              <Link
                href="/agenda"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /agenda
              </Link>
              .
            </p>
            <p className="text-slate-700">
              Em <strong>Configurações</strong>, ajuste nome da clínica,
              horários e duração da consulta. Em <strong>Pacientes</strong>,
              cadastre sua base principal com dados completos e alertas de
              saúde. Em <strong>Agenda</strong>, revise o dia e confirme os
              horários mais críticos. Esse trio evita retrabalho já na primeira
              semana.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Dashboard: o que olhar antes de começar a atender
            </h2>
            <p className="text-slate-700">
              O painel em
              <Link
                href="/dashboard"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /dashboard
              </Link>
              mostra os indicadores que impactam sua operação: consultas do mês,
              pacientes ativos e alertas operacionais. Em vez de abrir dez abas,
              use esse resumo para decidir a prioridade do dia.
            </p>
            <p className="text-slate-700">
              Regra prática: se a agenda está cheia e os retornos estão
              atrasados, ajuste sua régua de retorno antes de abrir novos
              horários. Crescer a agenda sem controlar retorno aumenta faltas e
              piora previsibilidade de caixa.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Pacientes: cadastro bem feito reduz erro clínico
            </h2>
            <p className="text-slate-700">
              No modulo
              <Link
                href="/patients"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /patients
              </Link>
              , registre além do básico: CPF, e-mail, endereço, contato de
              emergência e origem do paciente. Esses dados ajudam no financeiro,
              no recall e no relacionamento de longo prazo.
            </p>
            <p className="text-slate-700">
              O histórico de saúde deve ser atualizado no cadastro para que os
              alertas apareçam no perfil e no fluxo clínico. Se o paciente é
              diabético, usa anticoagulante ou tem alergia, isso precisa estar
              visível antes do início do procedimento.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Prontuário e anamnese: registre uma vez, reaproveite sempre
            </h2>
            <p className="text-slate-700">
              Em
              <Link
                href="/medical-records/new"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /medical-records/new
              </Link>
              , a anamnese é estruturada e o sistema reaproveita dados do
              cadastro para acelerar o preenchimento. O objetivo é manter
              consistência clínica sem te prender em formulário longo.
            </p>
            <p className="text-slate-700">
              Use o registro fotográfico em toda evolução relevante. A foto com
              data e contexto evita dúvida em retorno, sustenta conduta clínica
              e protege sua documentação em caso de questionamento.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Agenda: confirmação e cancelamento com menos ruído
            </h2>
            <p className="text-slate-700">
              Em
              <Link
                href="/agenda"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /agenda
              </Link>
              , confirme ou cancele consultas direto no calendário. Isso
              atualiza seu controle interno e dispara notificação por e-mail
              para o paciente sem depender de recado manual no meio do
              atendimento.
            </p>
            <p className="text-slate-700">
              Quando houver encaixe, confirme primeiro os horários com maior
              risco de ausência. Essa ação simples reduz janela ociosa e melhora
              previsibilidade do dia.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Autoagendamento: como usar sem perder controle
            </h2>
            <p className="text-slate-700">
              O agendamento público por profissional fica na rota com seu slug,
              por exemplo{" "}
              <span className="font-semibold text-slate-900">/seu-slug</span>.
              Configure seus dias e horários em
              <Link
                href="/settings"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /settings
              </Link>
              antes de divulgar o link.
            </p>
            <p className="text-slate-700">
              Boa prática: revise o link público semanalmente no celular. Você
              verifica como o paciente enxerga a clínica e evita receber
              agendamento fora da sua janela real de atendimento.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Financeiro e billing: decida com número, não por sensação
            </h2>
            <p className="text-slate-700">
              Acompanhe transacoes em
              <Link
                href="/finance"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /finance
              </Link>
              e revise plano, limite de pacientes e assinatura em
              <Link
                href="/billing"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /billing
              </Link>
              . Esse acompanhamento evita bloqueio operacional em momento de
              agenda cheia.
            </p>
            <p className="text-slate-700">
              Se você está perto do limite de pacientes, planeje upgrade antes
              de travar o cadastro. O custo de perder ritmo de atendimento é
              maior do que o custo de ajustar o plano no tempo certo.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Esterilização: rastreabilidade que protege sua rotina
            </h2>
            <p className="text-slate-700">
              No modulo
              <Link
                href="/sterilization"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /sterilization
              </Link>
              , registre ciclos com materiais e status do indicador químico.
              Isso cria histórico técnico para auditoria e reduz erro de
              processo no dia a dia.
            </p>
            <p className="text-slate-700">
              Feche a semana emitindo o relatório e validando pendências. Cinco
              minutos de revisão evitam lacunas de registro que viram problema
              quando você mais precisa da informação.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              POPs e notificações: padronize o que se repete
            </h2>
            <p className="text-slate-700">
              Em
              <Link
                href="/pop-documents"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /pop-documents
              </Link>
              , use os POPs para padronizar documentos recorrentes com seus
              dados profissionais. Na central de
              <Link
                href="/notifications"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                notificações
              </Link>
              , acompanhe novas consultas e pendências sem depender de memória.
            </p>
            <p className="text-slate-700">
              Operação previsível nasce de padrão. O que se repete no seu
              consultório precisa ter fluxo definido, não improviso.
            </p>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Se algo não sair como esperado
            </h2>
            <p className="text-slate-700">
              Primeiro, revise dados de configuração em
              <Link
                href="/settings"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                /settings
              </Link>
              . Depois, valide o impacto no modulo em que o problema apareceu.
              Se ainda persistir, fale com nosso suporte e já envie contexto:
              tela, horário do ocorrido e paciente envolvido. Isso acelera muito
              a correção.
            </p>
            <p className="text-slate-700">
              E-mail de suporte:
              <a
                href="mailto:master@pododesk.com.br"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                master@pododesk.com.br
              </a>
              .
              <br />
              Telefone e WhatsApp:
              <a
                href="tel:+5511937474389"
                className="font-semibold text-primary hover:underline"
              >
                {" "}
                +55 11 93747-4389
              </a>
              .
            </p>
          </section>
        </article>
      </section>

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
                Quero testar o PodoDesk por 14 dias
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
              <span>
                (c) 2024 PodoDesk. Gestão clínica com precisão asséptica.
              </span>
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
              CNPJ 26.730.764/0001-26 | N 366 | CEP 12.908-540.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
