# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.1] - 2026-04-23

### Security

- **Validação server-side de tipo MIME e tamanho de arquivo em uploads**: uploads de avatar, logo e fotos de prontuário agora validam tipo MIME (whitelist `image/jpeg, image/png, image/webp, image/gif/heic/heif`) e tamanho máximo (5 MB imagens de perfil, 10 MB imagens médicas) diretamente no servidor — elimina bypass client-side via requisições diretas
- **Comparação de segredos com timing-safe**: substituído `!==` por `safeSecretEqual()` (HMAC-SHA256 + `timingSafeEqual`) nos três endpoints que verificam segredos de webhook/cron (`/api/payments/webhook`, `/api/internal/email-queue/process`, `/api/internal/whatsapp-reminders/process`) — previne timing attacks que permitiriam deduzir o segredo
- **Content Security Policy (CSP)**: adicionado header `Content-Security-Policy` em todas as respostas com diretivas `object-src 'none'`, `base-uri 'self'`, `form-action 'self' https:` e `frame-ancestors 'none'` — bloqueia XSS via plugins, injeção de tag `<base>` e sequestro de formulários
- **Middleware de proteção de rotas (defense-in-depth)**: criado `src/middleware.ts` que valida o JWT Supabase via `getUser()` (verificação server-side) antes de renderizar qualquer rota protegida — garante que nenhuma página acessível sem autenticação passe despercebida por omissão de `requireActiveTenant()`
- **Sanitização de parâmetro de busca de pacientes**: caracteres especiais do parser PostgREST (`%`, `(`, `)`, `,`) são removidos do parâmetro `q` em `GET /api/patients/search` antes de construir o filtro `.or()` — previne injeção de filtro PostgREST
- **Aviso de reCAPTCHA ausente em produção**: `verifyRecaptchaToken()` agora emite `console.warn` quando `RECAPTCHA_SECRET_KEY` não está configurada em `NODE_ENV=production`, alertando que formulários públicos estão desprotegidos

## [2.2.0] - 2026-04-23

### Added

- **Suporte multilingual (PT / EN / ES)**: site público agora exibe conteúdo em Português, Inglês e Espanhol; idioma detectado automaticamente pelo browser e persistido em cookie `NEXT_LOCALE`
- **Seletor de idioma no header**: botões PT 🇧🇷 / EN 🇺🇸 / ES 🇪🇸 exibidos no canto superior direito, visíveis em desktop e mobile
- **Arquivos de tradução**: criados `messages/pt.json`, `messages/en.json` e `messages/es.json` cobrindo todos os textos da home e da seção de preços
- **Middleware next-intl**: detecta locale do header `Accept-Language` na primeira visita e define cookie; página recarrega no idioma preferido do visitante

## [2.1.5] - 2026-04-23

### Changed

- **Hero da home atualizada**: substituída a imagem da segunda coluna pela arte local `public/sys_pododesk.png`, removidos efeitos de borda/sombra da imagem e ajustado o card de funcionalidades para destacar alertas e lembretes por WhatsApp

## [2.1.4] - 2026-04-23

### Fixed

- **WhatsApp não enviado ao criar consulta manual**: o fluxo `createManualAppointmentAction` cadastrava a consulta e enviava apenas e-mail; agora também dispara `sendWhatsAppEventNotification` com evento `booking`, usando o telefone do paciente resolvido no cadastro

## [2.1.3] - 2026-04-23

### Fixed

- **WhatsApp não enviado em agendamento e confirmação**: chamadas `sendWhatsAppEventNotification` eram fire-and-forget (sem `await`) antes do `redirect()`; o `NEXT_REDIRECT` do Next.js interrompia o Promise antes de completar — corrigido adicionando `await` em `confirmAppointmentAction` e `cancelAppointmentAction`
- **Logging detalhado em `whatsapp-notifications.ts`**: adiciona `console.log` em cada ponto de saída antecipada (sem telefone, tenant desconectado, template desativado/ausente) e log de erro no upsert de template auto-criado para diagnóstico via logs do servidor

## [2.1.2] - 2026-04-17

### Fixed

- **Fix User-Agent nos cron workflows (email-queue e whatsapp-reminders)**: WAF/ModSecurity da Hostinger bloqueava requests com UA contendo "Bot" (erro 403); trocado para UA padrão de navegador, adicionado retry com backoff, e steps de status agora são `continue-on-error` para não bloquear processamento

## [2.1.1] - 2026-04-17

### Fixed

- **Auto-criar template de evento WhatsApp quando não existir**: corrige envio em novo agendamento para profissionais que nunca abriram `/settings` após a migration; template default é criado automaticamente via upsert no momento do envio

## [2.1.0] - 2026-04-17

### Added

- **WhatsApp automático em agendamento/confirmação/cancelamento**
  - Ao agendar, confirmar ou cancelar uma consulta, o paciente recebe automaticamente uma mensagem via WhatsApp (se conectado e paciente tiver telefone)
  - Templates editáveis separados dos lembretes: Agendamento, Confirmação e Cancelamento
  - Nova seção "Mensagens de evento" no painel de configurações com toggle on/off e variáveis dinâmicas
  - Nova tabela `whatsapp_event_templates` com RLS por tenant (migration `20260417000045`)
  - Nova lib `whatsapp-notifications.ts` reutilizável (fire-and-forget, não bloqueia o fluxo)
  - API routes: `GET/POST /api/whatsapp/event-templates`, `PUT /api/whatsapp/event-templates/[id]`
  - Hooks em `notifyNewPublicAppointment()`, `confirmAppointmentAction()` e `cancelAppointmentAction()`

## [2.0.3] - 2026-04-17

### Changed

- **README.md atualizado para v2.0**: versão, features WhatsApp/Evolution API, variáveis de ambiente (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `WHATSAPP_REMINDER_CRON_SECRET`), migration, seção de cron de lembretes e estrutura do projeto

## [2.0.2] - 2026-04-17

### Fixed

- **Diagnóstico e preparação para QR code da Evolution API**
  - Identificado bug conhecido na Evolution API v2.2.3 ([#2504](https://github.com/EvolutionAPI/evolution-api/issues/2504)): `{count: 0}` sem base64
  - Tipos atualizados em `evolution-api.ts` para formato de resposta v2.3+ (`pairingCode`, `code`, `base64`, `count`)
  - UI mostra orientação de upgrade quando QR code não é gerado após 5 tentativas
  - Rota `/api/whatsapp/instance/status` agora limpa referências órfãs quando instância não existe mais na Evolution API
  - Solução: atualizar Evolution API para v2.3.7+ (`evoapicloud/evolution-api`)

## [2.0.1] - 2026-04-17

### Fixed

- **Correção de conectividade com a Evolution API**
  - `EVOLUTION_API_URL` corrigida para `http://evolution.pododesk.com.br:8080` (porta 8080, HTTP)
  - Registro DNS A criado para `evolution.pododesk.com.br` → `147.15.18.67`
  - Resolve o erro "Falha ao criar instância WhatsApp" causado por DNS não resolvido

## [2.0.0] - 2026-04-17

### Added

- **Integração WhatsApp via Evolution API (WHATSAPP-BAILEYS)**
  - Conexão de instância por QR Code na página de Configurações
  - Desconexão e reconexão com polling automático de status

- **Lembretes automáticos de consulta via WhatsApp**
  - Até 3 templates de lembrete configuráveis por tenant
  - Variáveis dinâmicas: `{{paciente}}`, `{{clinica}}`, `{{profissional}}`, `{{data}}`, `{{horario}}`
  - Tipo de disparo configurável: horas ou dias antes da consulta
  - Toggle de ativação/desativação por template
  - Deduplicação por appointment + template (tabela `whatsapp_reminders_sent`)

- **CRUD de templates de lembrete**
  - `GET/POST /api/whatsapp/templates` — listagem e criação (limite de 3)
  - `PUT/DELETE /api/whatsapp/templates/[id]` — edição e exclusão

- **GitHub Actions cron para processamento de lembretes**
  - Workflow `whatsapp-reminders-cron.yml` executando a cada 1 hora
  - Chamada autenticada via `WHATSAPP_REMINDER_CRON_SECRET`

- **UI de templates no painel de Configurações**
  - Editor visual com botões de inserção de variáveis
  - Configuração de timing (ex: 24h antes, 2 dias antes)
  - Toggle ativo/inativo e preview em tempo real

### Changed

- **Migração Supabase `20260417000044_whatsapp_simplify_reminders.sql`**
  - Tabelas `whatsapp_reminder_templates` e `whatsapp_reminders_sent` com RLS
  - Seed automático de template padrão "Lembrete 24h" para tenants conectados
  - Remoção de tabelas obsoletas (`whatsapp_messages`, `whatsapp_contacts`)
  - Coluna `whatsapp_reminder_sent_at` removida de `appointments`

- **`evolution-api.ts` simplificado** — apenas `createInstance`, `deleteInstance`, `connectionState`, `getQRCode`, `sendTextMessage`
- **Instância criada sem webhook** — sistema outbound-only (envia, não recebe)

## [1.4.4] - 2026-04-09

### Changed

- **PDF do POP alinhado ao branding e identificação da clínica**
  - Texto ajustado para `Registro profissional ou CPF/CNPJ` no PDF
  - Paleta visual do PDF atualizada com cores da PodoDesk
  - Logo da clínica adicionada no rodapé do PDF (quando disponível)

## [1.4.3] - 2026-04-09

### Changed

- **Diagramação do PDF do POP aprimorada para leitura e impressão**
  - Cabeçalho com contexto do manual e data de atualização
  - Hierarquia visual para título, seções, subtítulos e itens de lista
  - Paginação automática no rodapé (`Página X de Y`)
  - Quebra de página e espaçamento otimizados para evitar cortes de conteúdo

## [1.4.2] - 2026-04-09

### Added

- **Exportação real em PDF no detalhe de POP (`/pop-documents/[id]`)**
  - Novo componente client `PopDownloadPdfButton` com geração via `jsPDF`
  - Download do documento em formato `.pdf`, mantendo layout operacional para uso em auditorias e rotina clínica

### Changed

- **Ações da página de POP ajustadas para impressão/PDF**
  - Botões `Baixar POP` e `Imprimir` não aparecem na mídia de impressão (`print:hidden`), evitando contaminar o arquivo final

- **Revisão textual PT-BR em fluxos operacionais**
  - Correções de acentuação e padronização em `/helpdesk`, `/settings` e conteúdo de POP
  - Migration `20260409000042_pop_manual_ptbr_accents.sql` criada para refletir os ajustes no template do banco

## [1.4.1] - 2026-04-09

### Changed

- **POP com dados do cadastro corrigidos em `/pop-documents/[id]`**
  - `{{ESTABELECIMENTO}}` e placeholders equivalentes agora usam o campo de cadastro "Nome da clínica"
  - `{{REGISTRO_OU_CPF}}` e placeholders equivalentes agora usam registro profissional com fallback para "CPF ou CNPJ para faturamento"
  - Formatação visual revisada com títulos/subtítulos para leitura e impressão
  - Texto do manual revisado em português pt-BR

- **Sincronização de banco validada via CLI Supabase**
  - Migration `20260409000041_pop_manual_ptbr_format.sql` aplicada com sucesso no remoto
  - Local/remoto alinhados em `41/41`

## [1.4.0] - 2026-04-09

### Added

- **Manual de POP completo em `/pop-documents`**
  - Novo template "Manual de Boas Praticas e Procedimentos Operacionais Padrao (POP)" com base legal (RDC 15/2012, RDC 222/2018 e RDC 63/2011)
  - Injeção dinamica de placeholders com dados do cadastro: estabelecimento, nome profissional e registro/CPF
  - Botao `Baixar POP` no detalhe do documento para uso operacional imediato

### Changed

- **Fallback de identificacao profissional no POP**
  - Quando `professional_register` nao estiver preenchido, o documento usa `tenant.cpf_cnpj`

- **Sincronizacao de banco validada via CLI Supabase**
  - Migration `20260409000040_pop_manual_template.sql` aplicada com sucesso no remoto
  - Local/remoto alinhados em `40/40`

## [1.3.2] - 2026-04-09

### Added

- **Central de ajuda operacional (`/helpdesk`)**
  - Nova página pública com guia didático por módulo para operação diária do SaaS
  - Conteúdo orientado ao perfil de podólogo autônomo, com foco em rotina prática de consultório
  - Seções de uso para Dashboard, Pacientes, Prontuário, Agenda, Autoagendamento, Financeiro, Esterilização, POPs e Notificações

- **Página de contato pública (`/contato`) com formulário funcional**
  - Formulário com validações server-side e envio via SMTP
  - Mensagens encaminhadas para `master@pododesk.com.br`
  - Exibição dos canais de contato oficiais (e-mail e WhatsApp)

### Changed

- **Rodapé público atualizado com navegação de suporte real**
  - Item `Central de Ajuda` dos rodapés públicos agora aponta para `/helpdesk`
  - Item `Contato` dos rodapés públicos agora aponta para `/contato`

- **Sincronização de banco validada via CLI Supabase**
  - `db:migrations` executado com local/remoto alinhados (39/39)
  - `db:push` executado sem pendências (`Remote database is up to date`)

## [1.3.1] - 2026-04-09

### Changed

- **Navegação pública e blog refinados**
  - Header e footer adicionados às páginas `/blog` e `/blog/[slug]`, seguindo o padrão visual das páginas públicas
  - Item `Blog` mantido apenas em menus públicos (header/footer)
  - Item `Blog` removido dos menus internos (sidebar da área protegida e painel admin)

- **Sincronização de banco validada via CLI Supabase**
  - `db:migrations` executado com local/remoto alinhados
  - `db:push` executado sem pendências (`Remote database is up to date`)

## [1.3.0] - 2026-04-09

### Added

- **Blog CMS com Sanity integrado ao app**
  - Estrutura de schema `post` no Studio Sanity com `title`, `slug`, `mainImage`, `excerpt` e `body` (Portable Text)
  - Nova listagem pública de artigos em `/blog` com grid de cards (imagem, título e resumo)
  - Nova rota dinâmica de artigo em `/blog/[slug]` com renderização rica via `@portabletext/react`
  - SEO por artigo com `generateMetadata` consumindo `title` e `excerpt` do Sanity
  - Client dedicado `next-sanity` no app para queries GROQ server-side

### Changed

- **Versionamento do projeto atualizado para `v1.3.0`**
  - Dependências de conteúdo adicionadas: `next-sanity` e `@portabletext/react`

- **Sincronização de banco validada via CLI Supabase**
  - `db:migrations` executado com local/remoto alinhados
  - `db:push` executado sem pendências (`Remote database is up to date`)

## [1.2.1] - 2026-03-23

### Changed

- **Consentimento LGPD refinado para scripts de terceiros**
  - Scripts no `<head>` agora possuem categoria de consentimento: `essential`, `functional` ou `analytics`
  - Google Analytics e Microsoft Clarity podem ser cadastrados como `analytics` e só carregam após consentimento explícito
  - Google Search Console pode ser cadastrado como script/meta tag `essential` sem bloqueio analítico
  - Banner de cookies agora permite personalizar categorias funcionais e analíticas separadamente
  - Preferências podem ser reabertas posteriormente pelo botão `Cookies`
  - Política de privacidade atualizada para documentar Google Analytics, Google Search Console e Microsoft Clarity

## [1.2.0] - 2026-03-23

### Added

- **Gerenciamento de scripts no `<head>` via painel admin**
  - Nova página `/admin/settings` com CRUD de snippets HTML injetados no `<head>`
  - Formulário de adição com rótulo e conteúdo (aceita `<script>`, `<meta>`, `<link>`, etc.)
  - Lista de scripts instalados com edição inline, toggle ativo/inativo e exclusão com confirmação
  - Componente `HeadScriptsLoader` injeta snippets ativos no `<head>` de todas as páginas
  - Link "Configurações" adicionado ao sidebar do painel admin
  - Migration `20260323000037_head_scripts.sql` com tabela `head_scripts` e RLS

## [1.1.1] - 2026-03-23

### Added

- **Banner de consentimento de cookies (LGPD)**
  - Componente `CookieConsentBanner` fixo no rodapé com opções "Aceitar todos" e "Somente essenciais"
  - Preferência persistida em `localStorage` (sem cookie adicional)
  - Link "Saiba mais" direciona para `/politica-de-privacidade#cookies`
  - reCAPTCHA v3 condicionado ao consentimento funcional (formulários continuam funcionando sem ele)

- **Seção "Cookies e Tecnologias Similares" na Política de Privacidade**
  - Cookies essenciais (sessão Supabase Auth) e funcionais (reCAPTCHA) documentados
  - Âncora `#cookies` para link direto do banner
  - Instruções de como gerenciar preferências pelo navegador

## [1.1.0] - 2026-03-23

### Added

- **Criação manual de consultas pela agenda**
  - Botão "+ Nova consulta" dentro do modal do dia na agenda
  - Busca de pacientes existentes por nome/telefone (API `/api/patients/search`)
  - Cadastro rápido de novo paciente (nome, telefone, e-mail) direto no diálogo
  - Seleção de horário disponível no dia (API `/api/agenda/slots`)
  - Checkbox de consulta de retorno (`is_return`)
  - Consulta criada como confirmada automaticamente

- **Bloqueio de horários na agenda**
  - Formulário de bloqueio no modal do dia (início, fim, motivo)
  - Blocos exibidos em cinza nas células do calendário
  - Exclusão de blocos com botão no modal do dia
  - Horários bloqueados excluídos automaticamente dos slots disponíveis

- **Configuração de horário de almoço**
  - Novo fieldset em `/settings` com checkbox, hora de início e hora de fim
  - Validação: início < fim e dentro do expediente
  - Slots de almoço excluídos automaticamente da disponibilidade (booking público e agenda)

- **Migration `20260323000036_agenda_blocks_lunch_return.sql`**
  - Coluna `is_return` em `appointments`
  - Tabela `agenda_blocks` com RLS por tenant
  - Colunas `lunch_start_time` / `lunch_end_time` em `users`

- **Notificações operacionais de novas consultas**
  - Disparo de e-mail para paciente e profissional no momento do agendamento
  - Fallback assíncrono em fila persistente para novos agendamentos
  - Central interna de notificações com badge de não lidas e suporte a push web
- **Ferramentas operacionais de autenticação e push**
  - Script `push:vapid` para gerar chaves VAPID
  - Script `ops:booking-flow` para validar o pipeline de booking, notificações e push
- **Fluxo de recuperação de senha completo**
  - Nova página `/reset-password` valida o token, exige nova senha com confirmação e redireciona para login
  - `resetPasswordForEmail` chamado do browser client para que o verifier PKCE fique no localStorage (corrige "link inválido")
  - `verifyRecaptchaAction` — nova Server Action que apenas valida o token reCAPTCHA e retorna `{ok, error}`; lógica de envio migrada para o componente client
  - Mensagens de erro de rate limit e falha genérica exibidas em português no modal

### Changed

- **UX de autenticação: ajuda discreta via links + popup**
  - Bloco de reenvio de confirmação inline substituído por dois links de texto discretos abaixo do formulário em `/sign-in` e `/sign-up`
  - Clicar em "Não recebeu o e-mail de confirmação?" ou "Esqueci minha senha" abre overlay focado com campo de e-mail e reCAPTCHA
  - Componente `AuthHelpModals` unifica os dois fluxos; `ResendConfirmationForm` removido

- **reCAPTCHA v3 com bypass automático em localhost**
  - Em `localhost` e `127.0.0.1`, o formulário submete sem executar o widget para evitar falha por domínio não cadastrado
  - Comportamento de produção inalterado

- **Validação do link de recuperação de senha fortalecida**
  - Evita troca duplicada do mesmo `code` em `/reset-password`
  - Só marca "link inválido/expirado" quando não existe sessão válida após tentativa de troca

- **Agenda e booking totalmente internos ao sistema**
  - Remoção da dependência de Google Calendar nas rotas, UI, agenda e disponibilidade
  - Booking público passa a usar apenas horários configurados e consultas registradas no banco

- **Links de confirmação de conta corrigidos no Supabase Auth**
  - Fluxos de cadastro e troca de e-mail passam a forçar `emailRedirectTo` com a URL pública correta

- **Exclusão de usuários no admin com preservação de histórico**
  - Exclusão de profissionais mantém consultas e pacientes sem reatribuição automática
  - Histórico do paciente passa a mostrar o snapshot do nome do profissional removido
  - Trigger no banco impede reatribuir depois consultas órfãs de profissionais excluídos

- **Segurança do banco (Supabase linter)**
  - RLS habilitado em `billing_plan_prices` e `email_queue`
  - `search_path` fixado em todas as funções sinalizadas como mutable
  - Extensão `unaccent` movida para schema `extensions`

## [1.0.8] - 2026-03-22

### Changed

- **Rodapé da página inicial com identificação discreta da empresa**
  - Inclusão de `CNPJ`, `Nº` e `CEP` no footer de `/`
  - Conteúdo alinhado ao padrão já aplicado em `/politica-de-privacidade` e `/termos-de-uso`

## [1.0.7] - 2026-03-21

### Added

- **Páginas legais públicas publicadas**
  - Nova rota `/politica-de-privacidade` com conteúdo LGPD completo
  - Nova rota `/termos-de-uso` com conteúdo jurídico de uso da plataforma

### Changed

- **Rodapé das páginas legais padronizado com a home**
  - `/politica-de-privacidade` e `/termos-de-uso` agora reutilizam o mesmo layout de footer da landing
  - Inclusão discreta de identificação da empresa no rodapé: `CNPJ`, `Nº` e `CEP`

- **Landing page com links legais ativos no footer**
  - Links `Termos de Uso` e `Privacidade` deixam de usar `#` e passam a apontar para as rotas reais

- **Ajustes de linguagem e acentuação PT-BR em fluxos críticos**
  - Textos da home e mensagens de validação/erro foram normalizados com acentuação correta
  - Melhorias de legibilidade em `/patients/new`, `/patients/[id]/edit` e `/medical-records/actions.ts`

- **Dashboard: página pública abre em nova aba**
  - O atalho `Abrir página pública` em `/dashboard` passa a abrir com `target="_blank"` e `rel="noopener noreferrer"`

## [1.0.6] - 2026-03-21

### Added

- **CTA comercial de billing na sidebar**
  - Novo botão destacado com degradê laranja em `/billing` nas sidebars desktop e mobile
  - Texto muda entre `Faça sua assinatura` durante trial e `Faça Upgrade` quando já existe plano ativo pago

### Changed

- **Sidebar da área protegida refinada por altura da tela**
  - Navegação principal passa a ficar alinhada no topo e o bloco de assinatura/logout no rodapé em telas altas
  - Em telas mais baixas, fontes, paddings, gaps e logotipo são compactados automaticamente para preservar visibilidade
  - O item `Pacientes para retorno` ganha versão curta `Retornos` em alturas críticas

## [1.0.5] - 2026-03-21

### Added

- **Rastreabilidade por material no prontuário**
  - Novo seletor em `/medical-records/new` para vincular individualmente material e lote esterilizado
  - Persistência de `sterilization_materials_used` no snapshot da anamnese
  - Exibição no detalhe do prontuário em linhas no formato `Lote | Material Utilizado`

- **Recuperação de valores personalizados de "Outro" no novo prontuário**
  - `/medical-records/new` agora lista valores já salvos como `Outro: ...` em medicamentos, alergias e calçado predominante
  - Os valores recuperados ficam visíveis e pré-selecionados para o profissional

- **Novo status de indicador químico `not_measured`**
  - Migration `20260321000030_add_not_measured_chemical_indicator_status.sql`
  - O status passa a ficar disponível na Central de Esterilização e nos relatórios

### Changed

- **Fluxo de esterilização refinado para operação e auditoria**
  - Diário e relatório agora discriminam materiais por linha quando um ciclo possui múltiplos itens
  - Relatório mensal de esterilização recebeu cabeçalho com branding da clínica, indicadores-resumo e layout otimizado para PDF
  - O detalhe do ciclo passou a exibir corretamente `Aprovado`, `Reprovado` e `Não aferido`

- **Persistência de "Outro" expandida no cadastro e no prontuário**
  - Edição de paciente em `/patients/[id]/edit` agora reabre e pré-preenche os motivos de `Outro: ...`
  - O componente compartilhado `OtherReasonInput` passou a aceitar valor inicial
  - O novo prontuário continua sincronizando esses valores com o dado mestre do paciente

- **Formulário de novo prontuário simplificado**
  - Campo `Avaliação clínica geral / observações` removido de `/medical-records/new`
  - O backend deixou de exigir `clinical_assessment` como obrigatório

- **Ajustes de impressão na área protegida**
  - Sidebar desktop e menu mobile deixam de aparecer em impressão/PDF

### Fixed

- **Fallback para schema cache em `referral_source`**
  - `patients/actions.ts` voltou a tolerar ambientes onde a coluna ainda não está visível no PostgREST
  - Em caso de erro de schema cache, create/update repetem a operação sem `referral_source`

## [1.0.4] - 2026-03-21

### Changed

- **Central de Esterilização com ajustes de responsividade no formulário Novo ciclo**
  - Refinado o espaçamento dos cards para melhorar leitura em telas pequenas
  - Grid do bloco principal reorganizado para preservar usabilidade no mobile e alinhamento no desktop

- **Campo de materiais do Novo ciclo agora aceita itens repetidos**
  - Removida a regra que bloqueava duplicidade de material
  - O profissional pode adicionar o mesmo material mais de uma vez quando necessário no ciclo

## [1.0.3] - 2026-03-21

### Added

- **Cadastro de materiais na Central de Esterilização**
  - Novo botão "Cadastrar material" em `/sterilization`
  - Ação abre popup com formulário para cadastrar material pelo nome
  - Materiais são persistidos em `materials` por tenant

- **Seleção de múltiplos materiais no módulo "Novo ciclo"**
  - Campo "Material esterilizado" agora exibe lista de materiais cadastrados com botão de "Adicionar"
  - Cada material adicionado aparece em uma lista abaixo do campo
  - Itens da lista podem ser removidos por botão de "Excluir"

### Changed

- **Layout do formulário "Novo ciclo" refinado**
  - Campo "Data e hora" em 1 coluna
  - Campo "Número do ciclo/lote" em 2 colunas
  - Campo "Material esterilizado" em 1 coluna
  - Estrutura melhora a leitura e o preenchimento no desktop e mantém responsividade no mobile

## [1.0.2] - 2026-03-21

### Added

- **Campos condicionais de motivo em "Outros" no novo prontuário**
  - Em `/medical-records/new`, ao marcar "Outro/Outra" nas seções A (Triagem Sistêmica) e B (Hábitos e Estilo de Vida), o formulário agora abre uma linha para detalhar o motivo
  - Cenários cobertos: medicamentos contínuos, alergias e calçado predominante

### Changed

- **Persistência da anamnese ampliada no `anamnesis_data`**
  - Novos campos salvos no prontuário: `continuous_meds_other_reason`, `allergies_other_reason` e `predominant_footwear_other_reason`
  - Os valores são gravados apenas quando a opção "Outro/Outra" correspondente está selecionada

## [1.0.1] - 2026-03-21

### Changed

- **Experiencia mobile ampliada em paginas operacionais**
  - `/patients`: listagem em cards no mobile para facilitar leitura e toque
  - `/patients/recall`: cards com acoes de "Ver paciente" e WhatsApp mais acessiveis
  - `/agenda`: navegacao de mes otimizada para telas pequenas e visao mobile em lista de dias com consultas
  - `/finance`: transacoes em cards no mobile, mantendo tabela no desktop
  - `/sterilization`: filtros e acoes ajustados para mobile e historicos convertidos em cards no celular

### Added

- **Captura de imagens no prontuario com foco em celular**
  - Novo fluxo com botao de camera (`capture="environment"`) e galeria na tela `/medical-records/new`
  - Preview das imagens selecionadas com remocao individual
  - Limite de ate 4 imagens por prontuario com feedback visual no formulario

### Fixed

- **Upload de fotos tiradas pela camera em mobile (iOS/Android)**
  - Substituida a tecnica baseada em `input.files = DataTransfer` por injecao no evento nativo `formdata`
  - Correção garante que as fotos mostradas no preview sejam realmente enviadas ao server action

## [1.0.0] - 2026-03-21

### Added

- **Sistema de cupons completo**
  - Painel admin de cupons em `/admin/coupons` para criar e editar regras de desconto
  - Regras suportadas: validade, limite total de uso, ciclos com desconto, escopo mensal/anual e tipo fixo/percentual
  - Novas tabelas `coupons` e `coupon_redemptions` com rastreabilidade por usuário/tenant
  - Uso único por usuário garantido por constraints e validações no fluxo

- **Admin pricing dinâmico**
  - Nova área `/admin/pricing` para gestão de preços e limites de pacientes por plano
  - Tabela `billing_plan_prices` como fonte de verdade para landing e billing

- **Upgrade do painel admin de usuários**
  - Coluna de admin com switch dedicado
  - Coluna de ações com ícones de editar e excluir
  - Exclusão protegida: admins não podem ser excluídos sem revogar função antes

- **Camada de segurança com reCAPTCHA v3**
  - Proteção em login, cadastro e booking público
  - Componentes reutilizáveis para formulário com token server-side

- **Fluxo de assinatura com dados de faturamento**
  - Novo fluxo de checkout com validação de CPF/CNPJ e seleção de método de cobrança
  - Persistência de perfil de faturamento e método de assinatura por tenant

### Changed

- **Página `/billing` remodelada**
  - Grid de planos desacoplado e preparado para preços dinâmicos
  - Exibição de prévia de cupom aplicado por ciclo
  - Ajustes de feedback de sucesso/erro no fluxo de assinatura

- **Dashboard `/admin` com KPIs mais precisos**
  - Métricas com atualização dinâmica (sem cache estático de 30 minutos)
  - Contagem de profissionais excluindo admins
  - Trials vencendo considera apenas clientes em `trialing`
  - Consultas do mês excluem canceladas
  - Pacientes e consultas contabilizados por clientes com acesso ativo

- **Formulário `/patients/new` redesenhado**
  - Layout alinhado ao padrão visual de `/medical-records/new`
  - Campos dinâmicos para opções "Outros" com detalhamento de motivo

### Fixed

- **Erro de criação de cupom em produção**
  - Aplicação da migration pendente `20260321000029_coupon_system.sql`
  - Correção do erro `Could not find the table 'public.coupons' in the schema cache`

- **Correções de consistência no onboarding e billing**
  - Persistência de `signup_coupon_code` no tenant
  - Vínculo de resgate de cupom ao ciclo de assinatura e baixa por webhook de pagamento

## [0.10.0] - 2026-03-19

### Added

- **Nova landing page comercial** em `src/app/page.tsx`
  - Hero, seções de recursos e pricing completo (Starter, Pro, Clínica, Enterprise)
  - Toggle de cobrança mensal/anual com atualização dinâmica dos preços
  - Menu mobile no header da home para manter navegação funcional em telas pequenas

- **Branding público da clínica no agendamento**
  - Logo da clínica exibida no topo das páginas públicas de booking (`/[professional_slug]` e `/clinic/[tenant_slug]/book`)
  - Contexto de booking passou a incluir `tenant.logo_url`

- **Fluxo clínico de retorno no novo prontuário**
  - Campo de paciente pré-preenchido e bloqueado quando a abertura parte de `/patients/[id]`
  - Checkbox de "consulta de retorno" no formulário
  - Persistência do indicador de retorno em `anamnesis_data`

### Changed

- **UX/UI do booking público refinada** para melhor legibilidade e responsividade
  - Melhorias de espaçamento, hierarquia visual e calendário
  - Conteúdo centralizado e ajustes no comportamento do resumo entre desktop e mobile

- **Navegação mobile da área protegida** evoluída para drawer com overlay e animação,
  preservando a sidebar no desktop

- **Página de novo prontuário redesenhada** com organização por seções, layout mais amplo,
  cards mais claros e barra de ações fixa

### Fixed

- **Persistência do logotipo da clínica em `/settings`**
  - Fluxo de salvamento reforçado para manter `logo_url` após submit
  - Upload de logo integrado ao submit principal (`logo_file`) com fallback de leitura de branding

## [0.9.5] - 2026-03-19

### Fixed

- **Erro de schema cache `referral_source`** — mesma causa raiz do `health_alerts`: PostgREST não reconhece colunas da migration 8
  - Diagnóstico via `select('*')` revelou que PostgREST conhece 25 de 27 colunas — faltam `health_alerts` e `referral_source` (ambas da migration 8)
  - Todas as queries de pacientes agora usam `select('*')` em vez de listar colunas explícitas, evitando erros de schema cache
  - Removido `referral_source` dos payloads de `insert`/`update` (campo do formulário permanece para quando o cache atualizar)
  - `medical-records/new/page.tsx`: select de saúde do paciente também migrado para `select('*')`

## [0.9.4] - 2026-03-19

### Fixed

- **Erro persistente de schema cache do PostgREST** (`Could not find the 'health_alerts' column of 'patients' in the schema cache`)
  - Causa raiz: a coluna `health_alerts` é 100% derivada das colunas de saúde (`has_diabetes`, `has_vascular_issues`, etc.) mas era gravada/lida via PostgREST, que mantinha cache stale impossível de invalidar
  - Ponto cego encontrado: `medical-records/actions.ts` fazia `.update({ health_alerts })` sem nenhum fallback
  - Correção definitiva: removida toda leitura/escrita de `health_alerts` via PostgREST em 3 arquivos (`patients/actions.ts`, `patients/[id]/page.tsx`, `medical-records/actions.ts`)
  - Alertas de saúde agora são computados em render-time via `buildHealthAlerts()` a partir das colunas estruturadas que funcionam normalmente
  - Banner de alertas clínicos continua funcionando sem depender do schema cache

## [0.9.3] - 2026-03-19

### Added

- **Ficha completa de cadastro do paciente** (dados administrativos e de saúde)
  - Campos de identificação: CPF, RG, e-mail
  - Contato e localização: bairro, endereço, CEP
  - Perfil social: ocupação, contato de emergência (nome e telefone)
  - Origem: fonte de captação (referral_source)
  - **Seção Histórico de Saúde** com toggles CSS-only (tablet/luvas): diabetes + tipo + insulina, vascular/cardíaco, distúrbio de coagulação, histórico oncológico, fumante, medicamentos contínuos, alergias, calçado predominante
  - Migration `20260319000023_patient_extended_fields.sql` (campos administrativos)
  - Migration `20260319000024_patient_health_columns.sql` (colunas estruturadas de saúde + índices GIN em arrays)

- **Ficha de Anamnese Estruturada Podológica** no prontuário
  - Seção A — Triagem Sistêmica: condições de risco, sub-campos de diabetes, medicamentos e alergias
  - Seção B — Hábitos e Estilo de Vida: fumante, atividade esportiva, calçado predominante
  - Seção C — Exame Físico: PA, glicemia capilar, queixa, avaliação dermatológica (5 achados), ortopédica (4 achados), ungueal (4 achados)
  - Desfecho: avaliação clínica, procedimento, recomendações, evolução
  - Dados persistidos em `anamnesis_data JSONB` para audit trail legal
  - Visualização estruturada com chips de risco, achados e tags no prontuário

- **Modelo híbrido de saúde** (dado mestre + snapshot por consulta)
  - Dados de saúde crônicos ficam no cadastro do paciente (`patients`) como dado mestre
  - Cada consulta snap-shot os dados na `anamnesis_data` do prontuário para rastreabilidade legal
  - `health_alerts TEXT[]` auto-calculado por `buildHealthAlerts()` — exibido como banner de alerta no perfil do paciente
  - Formulário de novo prontuário pré-preenche seções A e B com `defaultChecked`/`defaultValue` a partir do cadastro; banner avisa o profissional
  - Ao salvar prontuário, dados de saúde do paciente são atualizados automaticamente no cadastro

### Changed

- Utilitário `buildHealthAlerts` extraído para `src/lib/health-alerts.ts` (módulo puro, sem `"use server"`) para compatibilidade com Turbopack/Next.js 16 (apenas funções `async` podem ser exportadas de Server Actions)

### Fixed

- Erro de build no deploy (`Server Actions must be async functions`): `buildHealthAlerts` era exportada de `patients/actions.ts` (`"use server"`), causando falha no Turbopack — movida para `src/lib/health-alerts.ts`

## [0.9.2] - 2026-03-19

### Added

- Quick wins do Épico 9 (retenção)
  - Banner de alertas clínicos em `/patients/[id]` com base em `health_alerts`
  - Link dinâmico de WhatsApp no detalhe do paciente e na régua de recall
  - Nova página `/patients/recall` com pacientes cuja última consulta foi há mais de 30 dias

### Changed

- Endurecimento de tratamento de erro em integrações externas
  - Fluxo de checkout Asaas agora valida carregamento de tenant, ids retornados pela API e persistência da assinatura no banco
  - Webhook Asaas agora valida e loga erros explícitos na resolução e atualização de tenant
  - Processamento de fila de e-mails com validações adicionais de erro e correção de contagem de itens processados

## [0.9.1] - 2026-03-19

### Added

- Operacionalizacao da fila assíncrona de e-mail
  - Endpoint interno `GET /api/internal/email-queue/process` para consultar status da fila
  - Script `scripts/process-email-queue.mjs` para execucao manual/cron com status antes e depois
  - Script npm `email-queue:process` para facilitar automacao

### Changed

- Protecao do endpoint interno de fila unificada via secret em header `Authorization: Bearer <EMAIL_QUEUE_CRON_SECRET>`
- Documentacao atualizada com instrucoes de cron e monitoramento da fila

## [0.9.0] - 2026-03-19

### Added

- Fila assíncrona de e-mail para notificações de agendamento
  - Nova migration `20260319000020_email_queue.sql` com tabela `email_queue` e índices de processamento
  - Biblioteca `src/lib/email-queue.ts` para enfileirar e processar notificações com retry/backoff
  - Endpoint interno `POST /api/internal/email-queue/process` protegido por `EMAIL_QUEUE_CRON_SECRET`

### Changed

- Ações de confirmação/cancelamento na agenda deixaram de depender de envio SMTP síncrono
  - `src/app/(protected)/agenda/actions.ts` agora enfileira notificações no banco
  - Mensagens de sucesso da agenda atualizadas para refletir envio assíncrono
- Otimizações de render/cache em rotas críticas
  - Agenda com `revalidate = 300`
  - Admin com revalidação periódica
- Página de usuários admin com paginação server-side
  - Busca limitada, navegação por página e preservação de contexto ao alterar role
- Estratégia de análise de bundle atualizada para Next.js 16
  - Script `analyze` usa `next build --webpack`

### Performance

- Paralelização de queries em fluxos críticos (agenda e booking)
- Retry com backoff nas chamadas do Google Calendar para reduzir falhas transitórias
- Nova migration de índices para hot paths (`20260319000019_performance_indexes_hot_paths.sql`)

### Pruning

- Remoção de artefatos temporários de build/análise do repositório
- Ignorar logs locais de análise/build no `.gitignore`
- Limpeza de textos residuais de branding em telas e mensagens de UX

### Validation

- Lint: OK
- Testes: OK
- Build de produção: executado sem erro explícito nas validações finais

## [0.8.0] - 2026-03-19

### Added

- **Sistema de roles para administradores**
  - Nova coluna `is_admin` na tabela `users` para gerenciar acesso administrativo dinamicamente
  - Página `/admin/users` para listar e atribuir roles de admin
  - Server actions `getAdminUsersList()` e `toggleAdminRoleAction()` para gerenciar admins
  - Client component `ToggleAdminButton` para interações seguras com handlers
  - RLS policies no banco para proteger coluna `is_admin`
  - Fallback para `ADMIN_EMAIL` env var para compatibilidade
  - Proteção: não permite revogar próprio admin status se único admin existir

### Fixed

- Erro "Conta autenticada sem perfil interno" para usuários órfãos
  - Migration `20260319000017` removeu RLS policies quebradas
  - Migration `20260319000018` reparou usuários órfãos criados quando trigger falhou
- Erro de Server/Client Component na página de admin
  - Refatorado com Client Component separado para interações de usuário

### Changed

- `requireAdminAccess()` em `src/lib/auth.ts` agora verifica `is_admin` do banco ao invés de apenas email
- `AppUser` type agora inclui campo `is_admin: boolean`
- Admin migration queries agora trazem `is_admin` do banco

## [0.7.2] - 2026-03-18

### Fixed

- **Hotfix do build de `/billing` em produção**
  - `src/app/billing/actions.ts` deixou de exportar objetos e tipos a partir de arquivo com `"use server"`
  - `BILLING_PLANS`, `BillingTier` e `BillingPeriod` foram movidos para `src/app/billing/plans.ts`
  - Corrige falha de build do Next.js: `A "use server" file can only export async functions, found object`

## [0.7.1] - 2026-03-18

### Fixed

- **Hotfix de migration do hard lock Asaas**
  - `20260318000010_asaas_transition_and_hard_lock.sql` agora tolera ambientes onde `pop_documents`, `google_integrations` ou policies de storage ainda nao existem
  - `public.is_tenant_access_active()` passou a considerar `subscription_expires_at`, alinhando o bloqueio do banco ao bloqueio do app
  - Corrige falha no `db:push` com erro `relation public.pop_documents does not exist`

## [0.7.0] - 2026-03-18

### Added

- **Migração para Asaas (assinatura recorrente)**
  - `createCheckoutAction()` reescrito para criar cliente e assinatura no Asaas
  - Webhook `/api/payments/webhook` reescrito para processar eventos do Asaas
  - Novas variáveis de ambiente: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_SECRET`, `ASAAS_API_BASE`

- **Bloqueio rígido de acesso por assinatura vencida**
  - Novo campo `subscription_expires_at` no tenant para bloquear acesso após vencimento
  - Bloqueio aplicado também em rotas públicas de agendamento
  - Migration `20260318000010_asaas_transition_and_hard_lock.sql` adiciona regras de hard lock em RLS

### Changed

- UI de billing atualizada para "Assinar com Asaas"
- Mensagens de segurança e branding de pagamento migradas para Asaas

## [0.6.0] - 2026-03-18

### Added

- **Integração Mercado Pago — Assinaturas recorrentes**
  - SDK `mercadopago` instalado como dependência
  - `getMercadoPagoEnv()` em `src/lib/env.ts` valida `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`
  - `src/app/billing/actions.ts`: server action `createCheckoutAction()` cria Preapproval no MP e redireciona ao checkout
  - Planos configurados: Starter (50 pac.), Pro (100 pac.), Clínica (150 pac.) — mensais e anuais
  - Toggle Mensal/Anual com desconto de 10% na cobrança anual (`period-toggle.tsx`)

- **Página `/billing` — totalmente refeita**
  - Cards de planos com preços mensais e anuais
  - Exibe dias restantes de trial (ou "expirado") no topo
  - Feedback de sucesso/erro após retorno do checkout MP
  - CTA para contato em caso de mais de 200 pacientes

- **Webhook `/api/payments/webhook` — reescrito com segurança**
  - Validação de assinatura HMAC-SHA256 do header `x-signature` do Mercado Pago
  - Busca detalhes da assinatura via `PreApproval.get()` após receber notificação
  - Atualiza `subscription_status`, `billing_tier`, `max_patients_allowed`, `mp_subscription_id` e `mp_payer_email` no tenant
  - Usa `createAdminClient()` para write seguro com service role key

### Infrastructure

- Migration `20260318000009_add_mp_billing.sql`: adiciona `mp_subscription_id` e `mp_payer_email` à tabela `tenants`

## [0.5.2] - 2026-03-16

### Fixed

- **Compatibilidade de schema no upload e leitura de avatar**
  - Upload de avatar em `/settings` agora faz fallback para `profile_photo_url` quando `avatar_url` nao existe no schema remoto
  - `requireAuthenticatedUserWithClient()` mapeia `profile_photo_url` para `avatar_url` nos fallbacks de schema legado
  - Corrige erro: `Could not find the 'avatar_url' column of 'users' in the schema cache`

- **Widget "Especialista" no agendamento publico exibe avatar corretamente**
  - Contexto de booking passou a priorizar `avatar_url` e cair para `profile_photo_url` quando necessario
  - Compatibilidade preservada para bancos antigos sem a coluna `avatar_url`

### Infrastructure

- Documentacao atualizada para sincronizacao com deploy automatico da Hostinger (branch `master`) e checklist de `db:push`.

## [0.5.1] - 2026-03-16

### Fixed

- **Hotfix: Backward Compatibility para Fallback de Colunas de Schema**
  - Adicionado mecanismo inteligente de 2 níveis em `requireAuthenticatedUserWithClient()`
    para lidar com ausência de colunas `avatar_url` e `bio` em bancos regressados
  - Adicionado mecanismo inteligente de 2 níveis em `requireActiveTenant()`
    para lidar com ausência de colunas `billing_tier`, `max_patients_allowed`, `logo_url`
  - Quando colunas não encontradas em produção, sistema tenta query alternativa sem essas colunas
    e seta defaults: `billing_tier='free_trial'`, `max_patients_allowed=10`, `logo_url=null`, etc.
  - Resolve erro "Tenant da conta não encontrado" em produção enquanto migration 20260316000008
    aguarda aplicação ao Supabase remoto
  - Mantém compatibilidade total com versões antigas do schema

### Technical Details

- Fallback estratégico permite operação com schema incompleto (v0.4.0 -> v0.5.0 -> v0.5.1)
- Nenhuma mudança de API ou tipos de dado
- Todos os defaults mantêm app funcional mesmo com colunas faltando
- Quando migration 20260316000008 for aplicada a produção, fallbacks continuam funcionando

## [0.5.0] - 2026-03-16

### Added

- **Épico 7: Configuração de Perfil e Upload de Avatares**
  - Nova coluna `logo_url` em `tenants` (preparado em schema base)
  - Componente `ImageUpload` client-side com drag-drop, preview e upload
  - Funcionalidade `uploadProfileImageAction()` para upload de avatar/logo ao Supabase Storage
  - Seção "Perfil" em `/settings` com upload de avatar do profissional (128x128)
  - Seção "Clínica" em `/settings` com upload de logo da clínica (240x120)
  - Campo "Resumo profissional" (bio) para descrição na página pública (até 200 caracteres)
  - Upload automático para buckets `avatars` e `clinic-logos` com estrutura `{tenant_id}/{user_id}/{timestamp}.{ext}`
  - Validação de tamanho (máx 5MB) e tipo de arquivo (imagem apenas)

### Changed

- Tipos atualizados em `auth.ts`:
  - `AppUser` agora inclui `avatar_url` e `bio`
  - `Tenant` agora inclui `logo_url`
- Queries de `requireAuthenticatedUser()` e `requireActiveTenant()` carregam novos campos
- `/settings/page.tsx` reorganizada com 2 seções (Perfil e Clínica) e componentes de upload

### Technical Details

- Componente `ImageUpload` (client): suporta drag-drop, click, preview de imagem, feedback visual durante upload
- Server action `uploadProfileImageAction()` com tratamento de erro e revalidação automática
- Suporte a buckets já existentes no Supabase (nenhuma migration necessária para schema)
- Política de nomeação de arquivo: `{bucket}/{tenant_id}/{file_owner_id}/{timestamp}.{ext}`

### Breaking Changes

- Nenhuma

## [0.4.0] - 2026-03-16

### Added

- **Épico 6: Motor de Precificação por Volume de Pacientes**
  - Nova coluna `billing_tier` em `tenants` (free_trial, tier_1, tier_2, tier_3)
  - Nova coluna `max_patients_allowed` em `tenants` com limite configurável
  - Lógica de bloqueio ao atingir limite: redirecionamento para `/billing`
  - UI de bloqueio na página `/patients/new` com modal de upgrade
  - Widget de "Slots disponíveis" na página `/patients` mostrando `current/max`
  - Alerta visual na listagem quando número de slots < 3
  - Novo export `getPatientCountStatus()` para obter status de limite em qualquer context
  - Endpoint webhook preparado para integração Stripe/Mercado Pago (`/api/payments/webhook`)

- **Preparação para Épico 7 (Perfil): Novas colunas adicionadas**
  - `users.avatar_url` (URL do avatar no Supabase Storage)
  - `users.bio` (Resumo profissional para página pública)

- **Preparação para Épico 9 (Retenção): Novas colunas adicionadas**
  - `patients.health_alerts` (Array de strings para alertas clínicos: 'Diabético', 'Hemofílico', etc)
  - `patients.referral_source` (Rastreamento de como paciente conheceu a clínica)

### Changed

- Tipo `Tenant` em `auth.ts` agora inclui `billing_tier` e `max_patients_allowed`
- Query `requireActiveTenant()` carrega automaticamente info de billing
- Função `createPatientAction()` valida limite antes de inserir

### Technical Details

- Nova migration: `20260316000008_add_billing_alerts_profile.sql`
  - Adiciona 7 novas colunas em 3 tabelas (tenants, users, patients)
  - Índices GIN para `health_alerts` (busca eficiente)
  - Comentários SQL para documentação
- Webhook endpoint com estrutura preparada para validação de assinatura future

## [0.3.1] - 2026-03-16

### Added

- Confirmação/cancelamento de agendamentos com notificação por email aos pacientes
  - Nova coluna `confirmation_status` (enum: pending/confirmed/rejected) na tabela `appointments`
  - Nova coluna `google_event_id` para rastrear eventos do Google Calendar
  - Ações servidor: `confirmAppointmentAction()` e `cancelAppointmentAction()` em `.../agenda/actions.ts`
  - Sistema de email SMTP via nodemailer com templates HTML
  - Interface modal em `agenda-calendar.tsx` com botões de confirmar/cancelar
- Fallback automático para Google Calendar na `/agenda` quando nenhum agendamento existe no banco de dados
- Suporte a eventos externos do Google Calendar (read-only) com aviso ao usuário

### Changed

- Agenda carrega primeiro do banco de dados (`appointments` table com `confirmation_status`)
- Se mês vazio no DB, fallback automático para `listGoogleCalendarEvents()`
- Refatoração de performance:
  - Eliminação de duplicação de client Supabase em `src/lib/auth.ts` (novo `requireAuthenticatedUserWithClient()`)
  - Dashboard `/dashboard` agora paralleliza 3 queries com `Promise.all()`
  - Redução de TTFB estimada em 40-50%
- Otimizações de imagem:
  - Substituição de `<img>` por Next `Image` component em `/settings` (LCP melhorado)

### Security

- Adição de headers de segurança HTTP em `next.config.ts`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security` (somente em produção)
- Desabilitação de `X-Powered-By` header
- Redução de `bodySizeLimit` de 20MB para 5MB
- Verificação de segurança: **0 vulnerabilidades** (npm audit)
- Nenhum segredo hardcoded no código

### Fixed

- Login em produção: adição de try/catch em `signInAction()` para tratamento robusto de exceções
- Erro de mutação de cookies em Server Component: encapsulamento de `setAll()` em try/catch
- Redirecionamentos para domínio correto em produção (https://pododesk.com.br):
  - `src/lib/env.ts`: fallback ambiente-específico
  - Google OAuth routes (`/api/google/connect`, `/api/google/callback`): uso de `NEXT_PUBLIC_APP_URL` ao invés de `request.url`
  - Supabase config: `site_url` e `redirect_urls` atualizadas
- Autenticação SMTP Hostinger: password com quotes para suportar caracteres especiais (#)

## [0.2.0] - 2026-03-12

### Added

- Integração com Google Calendar OAuth
- Dashboard com KPIs de agendamentos
- Página de pacientes com histórico de prontuários
- Sistema de booking público por slug de profissional
- Integração com Google Calendar para visualização de eventos

### Fixed

- Erro `NEXT_REDIRECT` em fluxo de booking público: movimentação de `redirect()` para fora de blocos try/catch

## [0.1.0] - 2026-03-10

### Added

- Estrutura inicial Next.js com Supabase
- Autenticação de usuários (sign-in, sign-up)
- Layout protegido para profissionais
- Gestão de pacientes (CRUD)
- Gestão de prontuários médicos
- Gestão de documentos POP
- Temas com Tailwind CSS
- Testes com Vitest

[0.5.2]: https://github.com/spessoto/clinpe-saas/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/spessoto/clinpe-saas/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/spessoto/clinpe-saas/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/spessoto/clinpe-saas/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/spessoto/clinpe-saas/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/spessoto/clinpe-saas/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/spessoto/clinpe-saas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/spessoto/clinpe-saas/releases/tag/v0.1.0
