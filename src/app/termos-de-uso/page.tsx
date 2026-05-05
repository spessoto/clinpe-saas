import Image from "next/image";
import Link from "next/link";

export default function TermsOfUsePage() {
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
            <Link href="/sign-in" className="btn-gradient px-4 py-2 text-sm">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <article className="surface-card mx-auto mt-24 max-w-4xl px-6 py-10 md:mt-28 md:px-8 md:py-12">
        <header className="mb-8 space-y-2 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-secondary md:text-4xl">
            Termos de Uso - PodoDesk
          </h1>
          <p className="text-sm text-muted">Última atualização: 21/03/2026</p>
        </header>

        <div className="space-y-6 text-sm leading-7 text-foreground md:text-base">
          <p>
            Este Termo de Uso regula o acesso e a utilização da plataforma
            PodoDesk ("Plataforma" ou "Sistema"), desenvolvida e operada por
            26.730.764 CAIO CEZARES DE SOUZA SPESSOTO, inscrita no CNPJ sob o nº
            26,730,764/0001-26, com sede na R ROSA SGREVA PIGNATARI, 366, bairro
            JARDIM SAO LOURENCO, na cidade de BRAGANCA PAULISTA - SP, CEP
            12.908-540.
          </p>

          <p>
            Ao utilizar o sistema, você ("Usuário", "Profissional" ou "Clínica")
            declara ter lido, compreendido e concordado com estes Termos, bem
            como com a Política de Privacidade da Plataforma.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              1. Objeto do Serviço
            </h2>
            <p>
              O PodoDesk oferece um software SaaS (Software as a Service) de
              gestão para clínicas de podologia, incluindo funcionalidades como
              cadastro de pacientes, agendamento (incluindo autoagendamento
              online), prontuários eletrônicos, gestão de documentos (POPs) e
              controle financeiro.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              2. Cadastro e Responsabilidade da Conta
            </h2>
            <p>
              2.1. O acesso ao sistema depende de cadastro válido e
              autenticação. Você é integralmente responsável por manter a
              confidencialidade de suas credenciais de login.
            </p>
            <p>
              2.2. O Usuário se compromete a fornecer informações verídicas,
              atualizadas e completas durante o cadastro.
            </p>
            <p>
              2.3. O PodoDesk utiliza arquitetura Multi-Tenant com segurança em
              nível de linha (RLS) para garantir que os dados de uma clínica
              sejam rigorosamente isolados de outras. O Usuário é responsável
              por todas as atividades realizadas em sua conta e por seus
              colaboradores (se aplicável).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              3. Uso Permitido e Conduta
            </h2>
            <p>
              Você concorda em utilizar a Plataforma de forma lícita e ética.
              Fica terminantemente vedado:
            </p>
            <p>Tentar acessar dados de outros tenants/clínicas;</p>
            <p>
              Violar mecanismos de segurança do sistema, realizar engenharia
              reversa ou testar vulnerabilidades sem autorização;
            </p>
            <p>
              Utilizar o serviço para finalidade ilegal, fraudulenta ou para
              armazenar conteúdos maliciosos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              4. Responsabilidade Clínica e Médica
            </h2>
            <p>
              4.1. O PodoDesk é exclusivamente uma ferramenta de tecnologia da
              informação para apoio à gestão.
            </p>
            <p>
              4.2. A Plataforma não fornece aconselhamento médico, diagnósticos
              ou indicações de tratamentos. Toda a responsabilidade técnica,
              ética e civil decorrente dos atendimentos, procedimentos de
              esterilização e informações registradas nos prontuários é
              exclusiva do profissional de podologia ou da clínica que utiliza o
              sistema.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              5. Dados de Pacientes e LGPD
            </h2>
            <p>
              5.1. Para fins da Lei Geral de Proteção de Dados (LGPD - Lei nº
              13.709/2018), o Usuário (Profissional/Clínica) atua como
              Controlador dos dados de saúde de seus pacientes, e o PodoDesk
              atua estritamente como Operador, processando os dados apenas nos
              limites do funcionamento do software.
            </p>
            <p>
              5.2. O Usuário garante que possui as bases legais adequadas (como
              o consentimento do paciente) para inserir dados sensíveis de saúde
              na Plataforma.
            </p>
            <p>
              5.3. O PodoDesk adota medidas técnicas e organizacionais avançadas
              (criptografia e isolamento de banco de dados) para proteger essas
              informações.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              6. Integrações de Terceiros
            </h2>
            <p>
              6.1. A Plataforma oferece integrações com serviços de terceiros,
              como envio de e-mails transacionais, push web no navegador e envio
              de mensagens via WhatsApp.
            </p>
            <p>
              6.2. A utilização dessas integrações depende de autorização
              explícita do Usuário e sujeita-se aos Termos de Serviço e
              Políticas de Privacidade dos respectivos provedores (ex: Meta e
              provedores de e-mail). O PodoDesk não se responsabiliza por
              indisponibilidades nesses serviços externos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              7. Planos, Assinatura e Suspensão
            </h2>
            <p>
              7.1. O uso da Plataforma é oferecido mediante modelos de
              assinatura. Pode haver um período de teste gratuito (trial) e,
              posteriormente, a cobrança de um plano pago.
            </p>
            <p>
              7.2. O PodoDesk reserva-se o direito de restringir ou suspender o
              acesso à conta em caso de inadimplência financeira prolongada ou
              violação comprovada destes Termos de Uso.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              8. Propriedade Intelectual
            </h2>
            <p>
              O software, sua identidade visual, marcas, código-fonte,
              interfaces e demais elementos da Plataforma são de propriedade
              exclusiva do PodoDesk (Caio Cezares de Souza Spessoto). Não é
              permitido copiar, reproduzir, modificar, distribuir ou vender
              qualquer parte do sistema sem autorização expressa.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              9. Limitação de Responsabilidade
            </h2>
            <p>
              9.1. A Plataforma é fornecida "no estado em que se encontra" (as
              is), com esforço contínuo para garantir alta disponibilidade e
              segurança. Contudo, podem ocorrer indisponibilidades temporárias
              devido a manutenções programadas ou falhas de infraestrutura de
              terceiros (hospedagem).
            </p>
            <p>
              9.2. O PodoDesk não se responsabiliza por danos indiretos, lucros
              cessantes, perda de dados por erro exclusivo do Usuário ou
              prejuízos decorrentes da indisponibilidade temporária do sistema.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              10. Alterações destes Termos
            </h2>
            <p>
              O PodoDesk pode atualizar estes Termos a qualquer momento para
              refletir mudanças legais, técnicas ou comerciais.
            </p>
            <p>
              O Usuário será notificado sobre mudanças substanciais, e a versão
              mais recente estará sempre disponível na Plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              11. Foro e Legislação Aplicável
            </h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do
              Brasil. Fica eleito o foro da Comarca de Bragança Paulista - SP
              para dirimir quaisquer dúvidas ou litígios oriundos deste
              instrumento, com renúncia a qualquer outro, por mais privilegiado
              que seja.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">12. Contato</h2>
            <p>
              Em caso de dúvidas sobre estes Termos de Uso, suporte técnico ou
              questões de privacidade, entre em contato através do e-mail:
            </p>
            <p>
              <a
                href="mailto:master@pododesk.com.br"
                className="font-semibold text-primary hover:underline"
              >
                master@pododesk.com.br
              </a>
            </p>
          </section>
        </div>
      </article>

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
                  href="#"
                >
                  Segurança de Dados
                </a>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="/#precos"
                >
                  Preços
                </a>
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
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/blog"
                >
                  Blog
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

            <p className="text-center text-xs text-slate-500">
              CNPJ 26.730.764/0001-26 | Nº 366 | CEP 12.908-540.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
