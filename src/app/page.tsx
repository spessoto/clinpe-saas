import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  ClipboardCheck,
  FileSignature,
  TrendingUp,
} from "lucide-react";
import { getBillingPlans } from "@/app/billing/plans-server";
import { PricingSection, type PlanCard } from "@/app/pricing-section";

// Force server-side rendering on every request so the HTML always
// references the correct chunk hashes from the current build.
export const dynamic = "force-dynamic";

const featureCards = [
  {
    title: "Evolução Fotográfica",
    text: "Registre a evolução clínica com fotos organizadas por data e comparativos lado a lado de alta definição.",
    icon: Camera,
  },
  {
    title: "Autoagendamento",
    text: "Link exclusivo para seus pacientes agendarem consultas 24h por dia, reduzindo interrupções no WhatsApp.",
    icon: CalendarDays,
  },
  {
    title: "Alertas de Saúde",
    text: "Alertas automáticos para pacientes com condições de risco, como o pé diabético, garantindo segurança clínica.",
    icon: AlertTriangle,
  },
  {
    title: "Termos de Consentimento",
    text: "Assinatura digital de termos e anamneses diretamente no tablet ou celular, com validade jurídica.",
    icon: FileSignature,
  },
  {
    title: "Controle de Autoclave",
    text: "Gestão rigorosa de ciclos de esterilização e validade de materiais, cumprindo normas sanitárias.",
    icon: ClipboardCheck,
  },
  {
    title: "Relatórios Financeiros",
    text: "Fluxo de caixa, ticket médio por procedimento e indicadores de performance em tempo real.",
    icon: TrendingUp,
  },
];

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function Home() {
  const plans = await getBillingPlans();

  const planCards: PlanCard[] = [
    {
      name: plans.tier_1.label,
      monthly: formatMoney(plans.tier_1.monthly.amount),
      annual: formatMoney(plans.tier_1.annual.amount),
      limit: `Até ${plans.tier_1.maxPatients} pacientes`,
      featured: false,
      ctaLabel: "Iniciar meus 7 dias Grátis",
      ctaHref: "/sign-up",
      features: [
        "Prontuários ilimitados",
        "Agenda integrada",
        "Agendamento público online",
        "Integração Google Calendar",
        "Notificações por e-mail",
        "Suporte por e-mail",
      ],
    },
    {
      name: plans.tier_2.label,
      monthly: formatMoney(plans.tier_2.monthly.amount),
      annual: formatMoney(plans.tier_2.annual.amount),
      limit: `Até ${plans.tier_2.maxPatients} pacientes`,
      featured: true,
      ctaLabel: "Iniciar meus 7 dias Grátis",
      ctaHref: "/sign-up",
      features: [
        "Prontuários ilimitados",
        "Agenda integrada",
        "Agendamento público online",
        "Integração Google Calendar",
        "Notificações por e-mail",
        "Suporte por e-mail",
      ],
    },
    {
      name: plans.tier_3.label,
      monthly: formatMoney(plans.tier_3.monthly.amount),
      annual: formatMoney(plans.tier_3.annual.amount),
      limit: `Até ${plans.tier_3.maxPatients} pacientes`,
      featured: false,
      ctaLabel: "Iniciar meus 7 dias Grátis",
      ctaHref: "/sign-up",
      features: [
        "Prontuários ilimitados",
        "Agenda integrada",
        "Agendamento público online",
        "Integração Google Calendar",
        "Notificações por e-mail",
        "Suporte por e-mail",
      ],
    },
    {
      name: "Enterprise",
      monthly: "Sob consulta",
      annual: "Sob consulta",
      limit: "200+ pacientes",
      featured: false,
      ctaLabel: "Iniciar meus 7 dias Grátis",
      ctaHref: "mailto:contato@pododesk.com.br",
      features: [
        "Plano customizado para grandes operações",
        "Suporte estratégico dedicado",
        "Condições comerciais personalizadas",
        "Onboarding assistido",
      ],
    },
  ];

  return (
    <main className="bg-[radial-gradient(circle_at_10%_0%,rgba(15,143,135,0.14),transparent_34%),radial-gradient(circle_at_100%_0%,rgba(33,66,166,0.14),transparent_28%),linear-gradient(180deg,#f4fbfb_0%,#f9fbff_44%,#f6fafc_100%)] text-slate-700 selection:bg-primary/20 selection:text-primary">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/60 bg-[linear-gradient(90deg,rgba(244,251,251,0.94),rgba(247,250,255,0.94))] backdrop-blur-md">
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

          <details className="relative md:hidden">
            <summary className="inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700">
              <span className="flex w-4 flex-col gap-1">
                <span className="block h-0.5 w-full bg-current" />
                <span className="block h-0.5 w-full bg-current" />
                <span className="block h-0.5 w-full bg-current" />
              </span>
            </summary>

            <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <nav className="flex flex-col gap-1 text-sm">
                <a
                  href="#funcionalidades"
                  className="rounded-lg px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Funcionalidades
                </a>
                <a
                  href="#precos"
                  className="rounded-lg px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Preços
                </a>
                <Link
                  href="/sign-in"
                  className="rounded-lg px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Entrar
                </Link>
                <Link
                  href="/sign-up"
                  className="btn-gradient mt-2 px-4 py-2 text-center"
                >
                  Começar agora
                </Link>
              </nav>
            </div>
          </details>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#funcionalidades"
              className="border-b-2 border-primary pb-1 text-sm font-bold tracking-tight text-primary"
            >
              Funcionalidades
            </a>
            <a
              href="#precos"
              className="text-sm font-bold tracking-tight text-slate-600 transition hover:text-primary"
            >
              Preços
            </a>
            <Link
              href="/sign-in"
              className="text-sm font-bold tracking-tight text-slate-600 transition hover:text-primary"
            >
              Entrar
            </Link>
            <Link href="/sign-up" className="btn-gradient px-5 py-2">
              Começar agora
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pb-20 pt-32 md:px-8 md:pb-24 md:pt-36">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -right-20 top-24 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-gradient-to-r from-primary/20 to-secondary/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
              O futuro da podologia e digital.
            </span>

            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-secondary sm:text-5xl lg:text-6xl">
              Foque nos seus pacientes. Deixe a gestao com o PodoDesk.
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-slate-700">
              O sistema completo para clínicas de podologia que buscam
              excelência clínica e eficiência operacional sem burocracia.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="btn-gradient px-8 py-4 text-base font-bold"
              >
                Começar meus 7 dias grátis
              </Link>
              <a
                href="#funcionalidades"
                className="inline-flex items-center justify-center rounded-xl border border-secondary/20 bg-white/85 px-8 py-4 text-base font-bold text-secondary shadow-[0_10px_25px_-18px_rgba(33,66,166,0.85)] transition hover:bg-secondary/5"
              >
                Ver demonstração
              </a>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-2">
                <img
                  alt="Profissional"
                  className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAybX89hrZ19-3h-kusjs5s0hbAIybePuUzACIVtmnNJz4MXKnD2OKhKLQr9OdmEOqBJqup6Jg0WhyZ411tO_vt3jjErSDUUQ46ko0qzZEH4aHVr7U1StMIWDmilNgI_rVsHJLLl1OttcYDw0P5RH02BWgaxxYkR0Ynnvnf-sGfjc2J3HEueAetxY73MF848klfnmkNn038OejhKK5N2HjuyrJHWkILz6VhyPFtKDcme1sqp9lV40LrM73Bom5tU-su9yJfksX8"
                />
                <img
                  alt="Profissional"
                  className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCIU5ugajd2utPAwnlL4lijGN7eVUm5uNkImIUZoPFBDBCx3ILSgUqFeeADFAbNqVvW5Ue5OEd0Ug3lKr-9yJl_43hgOy_amonynQOWXKrKBBXYBg-zVV0o8wwsWUd-W8eDiftZLR4efm7NFg9vK0TEK_fNlhsT69UraXrg356dCQiLJa2inEpaG9d_y0ZQNn4EKRSXMzKLGtTftFpiUITay3TCY27fGE7znzpKuK1TiYtYKnmY_GW8Yea7Arz3zxenI75igOa"
                />
                <img
                  alt="Profissional"
                  className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUejtpyxA569suvrOeXCY8f2IefyihmiZe_pTQEM9embkW6E_uF_UGKgIJElUDgV74LofqIlK2fR8NmT12_TrA50uAJ4dMxGPY62M1ZnQRGmQDWSJMD1wCxxpsEWbZrpzrAUMNPHo1wsZDFrip3hqOoCZj2DEOECmPe4ulsFTWhZHbKtDcalqiYXrnd51_D71W1i-auKeD4eTjk46LMj4DfwT1VphfP_2QLf8vbB9tSKpixynVHZ4ksVOHbk5goNDBY6vdhLTh"
                />
              </div>
              <span className="text-sm font-medium text-slate-700">
                +500 podólogos já digitalizaram suas clínicas
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -right-10 -top-12 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="rounded-2xl border border-primary/15 bg-gradient-to-b from-white to-teal-50/30 p-2 shadow-[0_26px_54px_-20px_rgba(0,106,97,0.3)]">
              <img
                alt="Dashboard do sistema"
                className="h-auto w-full rounded-xl"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBNoK6H2qJ2TW4pbDb8g-XMdiTLGTlHbpR5B42KS8u4-wvhYQRM4Sx7kGHjkUjdyYWmFs8iTeV2KtTRy7SbJjnWkrD-fGwBqrVkgtDM3wLikuc9lCnZQTSrUTxgeCtBOLYcel_OiPVrJEZtMLmSw7wkpnU1DzkOgd1BLwKVzlTi51daruzD_B4rIZKOxN5nsU6GLTn7pPX_VT1EMj7rQ6EPtOIUg5e0R458zJynb699DCZy7aZlAYqtJNuaSfaX89L0devD--o"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(236,252,250,0.85)_100%)] px-6 py-24 md:px-8 md:py-28">
        <div className="mx-auto max-w-4xl space-y-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-secondary sm:text-5xl">
            Chega de papelada, faltas e desorganização.
          </h2>
          <p className="text-lg leading-relaxed text-slate-700">
            Nós transformamos o caos administrativo em fluxos de trabalho
            assepticamente limpos. Do primeiro contato ao pós-tratamento, tudo
            em um só lugar.
          </p>

          <div className="grid grid-cols-1 gap-8 pt-6 md:grid-cols-3">
            <div className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-full border border-secondary/20 bg-[radial-gradient(circle_at_30%_25%,#ffffff_0%,#eef6ff_65%,#e2ecff_100%)] shadow-[0_22px_40px_-24px_rgba(33,66,166,0.65)]">
              <div className="text-4xl font-extrabold text-secondary">98%</div>
              <p className="mt-2 px-5 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                Redução de Papel
              </p>
            </div>
            <div className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-full border border-secondary/20 bg-[radial-gradient(circle_at_30%_25%,#ffffff_0%,#eef6ff_65%,#e2ecff_100%)] shadow-[0_22px_40px_-24px_rgba(33,66,166,0.65)]">
              <div className="text-4xl font-extrabold text-secondary">45%</div>
              <p className="mt-2 px-5 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                Menos Faltas
              </p>
            </div>
            <div className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-full border border-secondary/20 bg-[radial-gradient(circle_at_30%_25%,#ffffff_0%,#eef6ff_65%,#e2ecff_100%)] shadow-[0_22px_40px_-24px_rgba(33,66,166,0.65)]">
              <div className="text-4xl font-extrabold text-secondary">
                2h/dia
              </div>
              <p className="mt-2 px-5 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                Economia de Tempo
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="funcionalidades"
        className="bg-[linear-gradient(180deg,rgba(240,249,255,0.9)_0%,rgba(238,250,247,0.85)_100%)] px-6 py-24 md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center md:text-left">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-primary">
              Potencialize sua prática
            </h3>
            <h2 className="text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
              Recursos projetados para a clínica moderna.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className={[
                    "group rounded-2xl border bg-gradient-to-b p-8 shadow-[0_20px_35px_-20px_rgba(15,23,42,0.22)] transition hover:-translate-y-1 hover:shadow-[0_26px_44px_-24px_rgba(15,23,42,0.35)]",
                    index % 3 === 0 &&
                      "border-primary/20 from-white to-teal-50/70 hover:border-primary/45",
                    index % 3 === 1 &&
                      "border-secondary/20 from-white to-blue-50/70 hover:border-secondary/45",
                    index % 3 === 2 &&
                      "border-emerald-500/20 from-white to-emerald-50/70 hover:border-emerald-500/45",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl",
                      index % 3 === 0 && "bg-primary/15",
                      index % 3 === 1 && "bg-secondary/15",
                      index % 3 === 2 && "bg-emerald-500/15",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-7 w-7",
                        index % 3 === 0 && "text-primary",
                        index % 3 === 1 && "text-secondary",
                        index % 3 === 2 && "text-emerald-600",
                      ].join(" ")}
                    />
                  </div>
                  <h4 className="mb-3 text-xl font-bold text-secondary">
                    {feature.title}
                  </h4>
                  <p className="leading-relaxed text-slate-700">
                    {feature.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <PricingSection planCards={planCards} />

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
                  href="#funcionalidades"
                >
                  Funcionalidades
                </a>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="#"
                >
                  Segurança de Dados
                </a>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="#precos"
                >
                  Preços
                </a>
              </div>

              <div className="space-y-3">
                <h4 className="mb-4 font-bold text-white">Suporte</h4>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="#"
                >
                  Central de Ajuda
                </a>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="#"
                >
                  Contato
                </a>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="#"
                >
                  Blog de Gestão
                </a>
              </div>

              <div className="space-y-3">
                <h4 className="mb-4 font-bold text-white">Legal</h4>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="#"
                >
                  Termos de Uso
                </a>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="#"
                >
                  Privacidade
                </a>
              </div>
            </div>

            <div className="flex w-full flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-sm text-slate-500 md:flex-row">
              <span>
                © 2024 PodoDesk. Gestão clínica com precisão asséptica.
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
          </div>
        </div>
      </footer>
    </main>
  );
}
