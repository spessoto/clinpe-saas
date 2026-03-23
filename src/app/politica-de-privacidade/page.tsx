import Image from "next/image";
import Link from "next/link";

export default function PrivacyPolicyPage() {
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
            <Link href="/sign-in" className="btn-gradient px-4 py-2 text-sm">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <article className="surface-card mx-auto mt-24 max-w-4xl px-6 py-10 md:mt-28 md:px-8 md:py-12">
        <header className="mb-8 space-y-2 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-secondary md:text-4xl">
            Política de Privacidade – PodoDesk
          </h1>
          <p className="text-sm text-muted">Última atualização: 21/03/2026</p>
        </header>

        <div className="space-y-6 text-sm leading-7 text-foreground md:text-base">
          <p>
            A presente Política de Privacidade descreve como o software PodoDesk
            ("nós", "nosso" ou "Plataforma"), desenvolvido e operado pela
            empresa 26.730.764 CAIO CEZARES DE SOUZA SPESSOTO, inscrita no CNPJ
            sob o nº 26.730.764/0001-26, com sede na R ROSA SGREVA PIGNATARI,
            366, JARDIM SAO LOURENCO, BRAGANCA PAULISTA - SP, CEP 12.908-540,
            coleta, utiliza, armazena e protege as informações pessoais dos
            usuários ("você", "Profissional" ou "Clínica") e de seus respectivos
            pacientes.
          </p>

          <p>
            Nós nos comprometemos a garantir a privacidade e a segurança dos
            dados, agindo em total conformidade com a Lei Geral de Proteção de
            Dados (LGPD - Lei nº 13.709/2018).
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              1. O Nosso Papel na LGPD (Controlador vs. Operador)
            </h2>
            <p>Para fins da legislação de proteção de dados:</p>
            <p>
              <strong>Você (Profissional/Clínica) é o Controlador</strong> dos
              dados dos seus pacientes. É você quem coleta o consentimento e
              decide inserir as informações de saúde no sistema.
            </p>
            <p>
              O PodoDesk atua estritamente como{" "}
              <strong>Operador de dados</strong>. Nós apenas processamos e
              armazenamos as informações sob as suas diretrizes, fornecendo a
              infraestrutura tecnológica segura para a sua gestão.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              2. Informações que Coletamos
            </h2>
            <p>
              Para fornecer nossos serviços, coletamos os seguintes tipos de
              informações:
            </p>
            <p>
              <strong>Dados de Conta e Perfil do Profissional:</strong> Nome
              completo, e-mail, telefone, CPF/CNPJ e endereço da clínica
              informados durante o cadastro.
            </p>
            <p>
              <strong>Dados Inseridos pelo Usuário (Dados de Saúde):</strong>
              Armazenamos as informações que você insere no sistema sobre seus
              pacientes (prontuários, anamneses, agendamentos e registros de
              esterilização). O PodoDesk garante que o acesso a esses dados é
              estritamente isolado (Multi-Tenant) e exclusivo do profissional
              que os inseriu.
            </p>
            <p>
              <strong>Dados de Autenticação:</strong> Credenciais de login e
              tokens de sessão gerados de forma segura.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              3. Como Utilizamos Suas Informações
            </h2>
            <p>As informações coletadas são utilizadas exclusivamente para:</p>
            <p>
              Fornecer, operar e manter o software funcionando adequadamente.
            </p>
            <p>
              Permitir a criação de prontuários eletrônicos e controle
              financeiro por parte da clínica.
            </p>
            <p>
              Enviar avisos técnicos, atualizações de segurança e mensagens de
              suporte.
            </p>
            <p>
              Sincronizar sua agenda de atendimentos podológicos com calendários
              externos, quando expressamente autorizado por você.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              4. Notificações Operacionais e Serviços Externos
            </h2>
            <p>
              Para facilitar a operação da clínica, o PodoDesk pode enviar
              notificações por e-mail e push web relacionadas a novas consultas,
              confirmações e cancelamentos de agendamentos.
            </p>
            <p>
              <strong>Quais dados utilizamos:</strong> Nome do paciente, e-mail,
              telefone, data e horário do atendimento e dados do profissional
              responsável, estritamente para compor os avisos operacionais da
              plataforma.
            </p>
            <p>
              <strong>Como usamos esses dados:</strong> Essas informações são
              usadas unicamente para enviar e-mails transacionais e notificações
              ao profissional autenticado no navegador que autorizou o push web.
            </p>
            <p>
              <strong>O que NÃO fazemos:</strong> O PodoDesk não comercializa
              dados de notificações, não usa esses dados para publicidade e não
              compartilha o conteúdo operacional com terceiros fora da
              infraestrutura estritamente necessária para entrega técnica.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              5. Compartilhamento de Informações
            </h2>
            <p>
              Nós não vendemos, alugamos ou comercializamos os seus dados
              pessoais ou os dados dos seus pacientes em nenhuma hipótese.
            </p>
            <p>
              Suas informações são compartilhadas apenas com provedores de
              infraestrutura de tecnologia essenciais para o funcionamento do
              SaaS (como nossos servidores de banco de dados e serviços de
              hospedagem), que também estão sujeitos a obrigações rigorosas de
              confidencialidade e segurança em nível global.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              6. Segurança dos Dados
            </h2>
            <p>
              Implementamos medidas técnicas e organizacionais de alto padrão
              para proteger suas informações:
            </p>
            <p>
              Utilizamos criptografia ponta a ponta (HTTPS/TLS) para transmissão
              de dados.
            </p>
            <p>
              Nossa arquitetura de banco de dados utiliza Políticas de Segurança
              em Nível de Linha (Row Level Security), garantindo que os
              registros de uma clínica jamais possam ser acessados por outra.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              7. Seus Direitos
            </h2>
            <p>Você tem o direito de:</p>
            <p>Acessar os dados pessoais que mantemos sobre você.</p>
            <p>Corrigir dados incompletos, inexatos ou desatualizados.</p>
            <p>
              Solicitar a exclusão da sua conta e dos dados vinculados a ela,
              respeitando os prazos de guarda legal obrigatórios.
            </p>
            <p>
              Revogar a qualquer momento o consentimento para integrações de
              terceiros (desconectando o Google Agenda diretamente no painel do
              sistema ou através da sua conta Google).
            </p>
          </section>

          <section id="cookies" className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              8. Cookies e Tecnologias Similares
            </h2>
            <p>
              O PodoDesk utiliza um número mínimo de cookies, estritamente
              necessários para o funcionamento e a segurança da plataforma. Não
              utilizamos cookies para rastreamento, publicidade ou análise
              comportamental.
            </p>
            <p>
              <strong>Cookies essenciais (sempre ativos):</strong> Cookies de
              sessão gerados pelo Supabase Auth para manter sua autenticação
              ativa. Sem eles, não é possível fazer login ou navegar pela área
              protegida do sistema. Esses cookies são estritamente técnicos e
              não coletam dados pessoais.
            </p>
            <p>
              <strong>Cookies funcionais (desativáveis):</strong> O Google
              reCAPTCHA v3 é utilizado para proteger formulários de login e
              cadastro contra bots. Ele pode definir cookies próprios do Google.
              Você pode optar por não carregar o reCAPTCHA através do banner de
              consentimento exibido no primeiro acesso ao site. Formulários
              continuam funcionando normalmente sem ele.
            </p>
            <p>
              <strong>Como gerenciar suas preferências:</strong> No primeiro
              acesso, um banner permite que você escolha entre aceitar todos os
              cookies ou somente os essenciais. Sua preferência é armazenada
              localmente no navegador (localStorage) e pode ser redefinida
              limpando os dados do site nas configurações do navegador.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-secondary">
              9. Contato e Dúvidas
            </h2>
            <p>
              Se você tiver qualquer dúvida sobre esta Política de Privacidade,
              sobre como lidamos com as APIs do Google ou desejar exercer seus
              direitos sob a LGPD, entre em contato conosco através dos
              seguintes canais:
            </p>
            <p>
              <strong>E-mail principal:</strong> master@pododesk.com.br
            </p>
            <p>
              <strong>Endereço físico:</strong> R ROSA SGREVA PIGNATARI, 366,
              JARDIM SAO LOURENCO, BRAGANCA PAULISTA - SP, CEP 12.908-540.
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
