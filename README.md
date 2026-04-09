# ClinPe App

SaaS de podologia multi-tenant com Next.js + Supabase, incluindo onboarding, dashboard, prontuários, autoagendamento, notificações por e-mail e push web.

## Status do projeto

- Versão publicada: `v1.3.0`
- Rebranding aplicado: `PodoDesk` -> `ClinPe`
- Repo: `https://github.com/spessoto/clinpe-saas`

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Auth, Postgres, Storage, RLS)
- Vitest + Testing Library

## Funcionalidades implementadas

- Épico 1: auth e onboarding com criação automática de tenant e trial
- Épico 2: dashboard com KPIs e CRUD de pacientes
- Épico 3: prontuários com upload de imagens no Storage
- Épico 4: autoagendamento público por profissional em `/{professional_slug}`
- Épico 5: POPs com templates e substituição dinâmica de placeholders
- Agenda: calendário mensal de consultas lido do banco de dados, com pop-up de dados do paciente e ações de confirmação/cancelamento
- Confirmação e cancelamento de agendamento: profissional pode confirmar ou cancelar cada consulta diretamente na agenda, com notificação por e-mail assíncrona (fila persistente)
- Notificação por e-mail: envio SMTP com template HTML responsivo (nodemailer) informando data, clínica, profissional e próximo passo
- Configurações white-label: perfil, nome da clínica, e-mail/nome do usuário, dias e horários de atendimento e duração da consulta
- Notificações de novas consultas: e-mail para paciente e podólogo com fallback assíncrono em fila
- Central de notificações do podólogo: página interna com badge de não lidas e suporte a push web no navegador
- **Ficha completa do paciente**: CPF, RG, e-mail, endereço, ocupação, contato de emergência, fonte de captação
- **Histórico de Saúde no cadastro**: diabetes (tipo + insulina), vascular, coagulação, oncológico, medicamentos contínuos, alergias, fumante, calçado — exibidos como alertas visuais no perfil
- **Anamnese estruturada podológica**: ficha A/B/C com triagem sistêmica, hábitos e exame físico; toggles CSS-only otimizados para tablet/luvas; snapshot JSONB por consulta para audit trail legal
- **Campos condicionais para "Outros" na anamnese**: em `/medical-records/new`, ao marcar opções "Outro/Outra" nas seções A e B, abre automaticamente uma linha para detalhar o motivo
- **Modelo híbrido**: dados de saúde crônicos armazenados no cadastro (dado mestre) e replicados como snapshot em cada prontuário; formulário de novo prontuário pré-preenche a partir do cadastro
- **Fluxo de retorno no prontuário**: ao iniciar nova consulta pelo detalhe do paciente, o nome fica pré-preenchido e bloqueado; formulário inclui marcador de consulta de retorno
- **Configurações de branding mais robustas**: upload e persistência de logotipo da clínica reforçados no `/settings`
- **Autoagendamento com identidade visual da clínica**: páginas públicas exibem logo da clínica no topo
- **UX mobile aprimorada**: menu drawer com overlay na área protegida e menu hambúrguer na landing page
- **UX mobile ampliada em módulos operacionais**: `/patients`, `/patients/recall`, `/agenda`, `/finance` e `/sterilization` com layouts mobile-first (cards/listas e navegação mais tocável)
- **Central de Esterilização com cadastro de materiais**: botão de cadastro com popup em `/sterilization`, persistência por tenant e sugestão de materiais já cadastrados
- **Novo ciclo com múltiplos materiais**: campo de materiais com adicionar/excluir em lista no próprio formulário de ciclo
- **Landing page comercial atualizada**: seção de planos completa (Starter, Pro, Clínica, Enterprise) com toggle mensal/anual
- **Gestão de cupons no admin**: criação e edição de cupons com validade, limite, ciclos e escopo mensal/anual em `/admin/coupons`
- **Preços dinâmicos no admin**: gestão de planos em `/admin/pricing`, refletindo em landing e billing
- **Billing com cupom e dados de faturamento**: checkout com CPF/CNPJ validado, método de pagamento e prévia de desconto por ciclo
- **Segurança reforçada com reCAPTCHA v3**: aplicado em login, cadastro e agendamento público
- **Registro fotográfico mobile no prontuário**: captura direta da câmera, seleção por galeria, preview com remoção e limite de até 4 imagens por prontuário
- **Rastreabilidade por material no prontuário**: seleção individual de lote + material em `/medical-records/new` com exibição detalhada no prontuário salvo
- **Recuperação de valores personalizados de "Outro"**: o novo prontuário reapresenta opções já cadastradas como `Outro: ...` para acelerar o atendimento
- **Central de Esterilização com status "Não aferido"**: ciclos e relatórios aceitam e exibem `not_measured`, mantendo compatibilidade operacional
- **Relatório de esterilização com branding para PDF**: cabeçalho com identidade da clínica, indicadores-resumo e tabela pronta para impressão
- **Sidebar comercial de billing**: CTA com destaque em degradê laranja levando para `/billing`, com rótulo dinâmico para trial e upgrade
- **Sidebar responsiva por altura**: menu da área protegida compacta tipografia e espaçamento em telas baixas, preservando assinatura/logout no rodapé quando houver altura suficiente
- **Admin users evoluído**: switch de admin, ações por ícone (editar/excluir), preservação do histórico de consultas ao excluir usuários e proibição de reatribuição automática para outros profissionais
- **KPIs de admin com precisão operacional**: métricas atualizadas em tempo real, excluindo canceladas e considerando apenas base ativa quando aplicável
- **Blog com Sanity CMS**: listagem pública em `/blog` e página dinâmica em `/blog/[slug]` com conteúdo rico (Portable Text)

## Requisitos locais

- Node.js LTS (recomendado: 24.x)
- npm 10+

## Instalacao

```bash
npm install
```

Se o PowerShell bloquear scripts do npm:

```bash
npm.cmd install
```

## Variaveis de ambiente

Crie `.env.local` na raiz do projeto com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxx
ADMIN_EMAIL=admin@seudominio.com

NEXT_PUBLIC_APP_URL=https://pododesk.com.br
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxx
VAPID_SUBJECT=mailto:contato@pododesk.com.br

# Asaas (assinaturas)
ASAAS_API_KEY=xxxxxxxx
ASAAS_WEBHOOK_SECRET=xxxxxxxx
ASAAS_API_BASE=https://api.asaas.com/v3

# E-mail SMTP (obrigatorio para confirmar/cancelar agendamentos)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=seu-email@seudominio.com
SMTP_PASS=sua-senha-smtp
SMTP_FROM="NomeClinica <seu-email@seudominio.com>"

# Fila de e-mail (processamento assíncrono via cron)
EMAIL_QUEUE_CRON_SECRET=um-segredo-forte

# Sanity CMS (blog)
NEXT_PUBLIC_SANITY_PROJECT_ID=mzldy58m
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
```

Observacoes:

- `SUPABASE_SERVICE_ROLE_KEY` e obrigatoria para fluxos de booking publico.
- `ADMIN_EMAIL` restringe o acesso ao novo painel administrativo em `/admin`.
- `ASAAS_API_KEY` e `ASAAS_WEBHOOK_SECRET` sao obrigatorias para billing por assinatura recorrente.
- `SMTP_*` sao obrigatorias para o envio de e-mail em novas consultas, confirmacoes e cancelamentos. Funciona com Hostinger (porta 465), Gmail (porta 587 + senha de app) ou Resend.
- `EMAIL_QUEUE_CRON_SECRET` protege o endpoint interno `POST /api/internal/email-queue/process` para processamento da fila.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` habilitam push web para avisar o podologo sobre novas consultas.
- `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` e `NEXT_PUBLIC_SANITY_API_VERSION` habilitam a leitura de artigos do blog via Sanity.

### Push web: onde configurar

Essas variáveis não vêm do Supabase nem da Hostinger. Elas precisam ser geradas pela própria aplicação e cadastradas no ambiente onde o app roda.

Gerar novas chaves localmente:

```bash
npm.cmd run push:vapid
```

O comando imprime exatamente estes três valores:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Onde configurar:

- Local: arquivo `.env.local`
- Produção na Hostinger: hPanel -> Node.js -> Environment Variables da aplicação `pododesk.com.br`

Depois de salvar na Hostinger, faça novo deploy/restart para que o servidor passe a enxergar os valores.

Valor recomendado para `VAPID_SUBJECT`:

- `mailto:contato@pododesk.com.br`

### Operacao da fila de e-mail

Endpoint interno protegido por secret:

- `POST /api/internal/email-queue/process?limit=20` processa lote da fila
- `GET /api/internal/email-queue/process` retorna status da fila (`pending`, `processing`, `failed`, `sent`)

Exemplo manual (PowerShell):

```bash
$headers = @{ Authorization = "Bearer $env:EMAIL_QUEUE_CRON_SECRET" }
Invoke-RestMethod -Method Get -Uri "https://seu-dominio.com/api/internal/email-queue/process" -Headers $headers
Invoke-RestMethod -Method Post -Uri "https://seu-dominio.com/api/internal/email-queue/process?limit=20" -Headers $headers
```

Script local de apoio:

```bash
npm.cmd run email-queue:process
```

Variaveis opcionais para o script:

- `EMAIL_QUEUE_BATCH_LIMIT` (default: 20, max: 100)
- `NEXT_PUBLIC_APP_URL` (default local: `http://localhost:3000`)

Cron recomendado em producao:

- Frequencia: a cada 1 minuto
- Metodo: `POST`
- URL: `https://seu-dominio.com/api/internal/email-queue/process?limit=20`
- Header: `Authorization: Bearer <EMAIL_QUEUE_CRON_SECRET>`

Sem cron nativo no provedor (ex.: alguns planos Hostinger):

- Use GitHub Actions com o workflow `/.github/workflows/email-queue-cron.yml`
- Defina os secrets do repositorio:
  - `APP_URL` (ex.: `https://pododesk.com.br`)
  - `EMAIL_QUEUE_CRON_SECRET` (mesmo valor da variavel de ambiente da aplicacao)
- Opcional: defina a repository variable `EMAIL_QUEUE_BATCH_LIMIT` (padrao: `20`)
- O workflow roda em `*/5 * * * *` (limite minimo do scheduler do GitHub Actions) e tambem pode ser executado manualmente via `workflow_dispatch`

## Banco de dados e migrations

As migrations SQL estao em `supabase/migrations`:

- `20260312000001_epic1_onboarding_auth.sql`
- `20260312000002_epic2_dashboard_patients.sql`
- `20260312000003_epic3_storage_medical_records.sql`
- `20260312000004_epic4_epic5_booking_google_pops.sql`
- `20260313000005_professional_booking_widget.sql`
- `20260313000006_professional_settings_schedule.sql`
- `20260316000007_appointment_confirmation_email.sql` — adiciona `confirmation_status` (pending/confirmed/rejected) na tabela `appointments`
- `20260316000008_add_billing_alerts_profile.sql` — expande billing base, perfil do profissional e alertas clinicos
- `20260318000009_add_mp_billing.sql` — legado da fase Mercado Pago
- `20260318000010_asaas_transition_and_hard_lock.sql` — transicao para Asaas e endurecimento do hard lock por assinatura/trial
- `20260318000011_admin_panel_foundation.sql` — fundacao do painel admin, free permanente, extensao manual de trial e audit log
- `20260319000020_email_queue.sql` — fila assíncrona de notificacoes de e-mail com retries
- `20260319000021_epic10_operational_finance_base.sql` — base do módulo financeiro operacional
- `20260319000022_sterilization_traceability_v2.sql` — rastreabilidade de esterilização v2
- `20260319000023_patient_extended_fields.sql` — campos administrativos do paciente: CPF, RG, e-mail, endereço, ocupação, contato de emergência, origem
- `20260319000024_patient_health_columns.sql` — colunas estruturadas de saúde no cadastro do paciente (modelo híbrido) com índices GIN em arrays
- `20260321000030_add_not_measured_chemical_indicator_status.sql` — adiciona o status `not_measured` ao enum de indicador químico da esterilização
- `20260323000031_remove_google_calendar.sql` — remove schema legado do Google Calendar
- `20260323000032_notifications_and_push.sql` — adiciona notificações internas e subscriptions de push web
- `20260323000033_allow_user_delete_with_appointments.sql` — preserva consultas ao excluir profissionais, com snapshot do nome e `professional_id` anulável
- `20260323000034_prevent_reassign_deleted_professional_appointments.sql` — impede reatribuição posterior de consultas órfãs de profissionais removidos
  Garanta que todas foram aplicadas no projeto Supabase antes de testar os fluxos de booking, configuracoes e notificações.

> **Atencao:** O nome dos arquivos de migration usa o formato `YYYYMMDDNNNNNN` (14 digitos sem underscore entre data e sequencia). Arquivos com o formato antigo `YYYYMMDD_NNNNNN` causam conflito de versao na CLI do Supabase.

### Aplicacao automatizada de migrations

Voce nao precisa ficar colando SQL manualmente no painel toda vez. Depois de fazer a configuracao inicial da CLI uma vez, aplique tudo com um unico comando.

1. Faça login na CLI:

```bash
npm run db:login
```

2. Vincule esta pasta ao seu projeto Supabase:

```bash
npm run db:link
```

3. Aplique todas as migrations pendentes:

```bash
npm run db:push
```

4. Se quiser conferir o que ja foi aplicado:

```bash
npm run db:migrations
```

Observacoes:

- No PowerShell do Windows, prefira `npm.cmd run db:push` se a policy bloquear `npm`.
- O `db:link` e uma etapa unica por projeto local.
- Depois disso, o fluxo normal passa a ser apenas `npm.cmd run db:push`.
- Este projeto ja possui `supabase/config.toml` com `project_id` preenchido a partir do ambiente local.
- No ambiente atual deste workspace, a politica do Windows bloqueou a execucao de `supabase.exe` via Device Guard. Quando a CLI for liberada na maquina, o fluxo automatizado passa a funcionar sem precisar abrir o SQL Editor.

## Executar localmente

```bash
npm run dev
```

Aplicacao em `http://localhost:3000` (desenvolvimento local) e em `https://pododesk.com.br` (producao).

## Deploy e sincronizacao com Hostinger

O ambiente de producao esta configurado para deploy automatico a partir da branch `master`.

Fluxo recomendado para sincronizar codigo + banco:

1. Validar localmente:

```bash
npm.cmd run lint
npm.cmd run build
```

2. Commitar e enviar para `master`:

```bash
git add -A
git commit -m "seu commit"
git push origin master
```

3. Aplicar migrations pendentes no Supabase de producao:

```bash
npm.cmd run db:push
```

4. Confirmar no painel da Hostinger se o deploy terminou sem erro.

Checklist rapido quando houver mudanca de schema:

- Push do codigo no `master`
- `db:push` aplicado no projeto remoto
- Login e `/settings` validados em producao
- Pagina publica de agendamento validada (`/{professional_slug}`)

## Qualidade

```bash
npm run lint
npm run test
```

Teste operacional do fluxo de agendamento/notificações:

```bash
npm.cmd run ops:booking-flow -- --email=profissional@dominio.com --minutes=120
```

Esse script confere, para a janela informada:

- agendamentos recentes do profissional
- notificações internas criadas
- subscriptions de push cadastradas
- entradas de fallback na `email_queue`

Modo watch:

```bash
npm run test:watch
```

## Estrutura principal

- `src/app`: rotas e paginas
- `src/app/(protected)/settings`: configuracoes do profissional e agenda de atendimento
- `src/app/(protected)/agenda`: calendario de consultas do sistema
- `src/app/(protected)/notifications`: central de notificacoes do podologo
- `src/app/[professional_slug]`: pagina publica white-label de autoagendamento
- `src/lib/auth.ts`: guardas de autenticacao e tenant
- `src/lib/booking.ts`: regras de slots e criacao de agendamento
- `src/lib/email.ts`: utilitario SMTP para envio de notificacoes ao paciente
- `src/lib/notifications.ts`: notificacoes internas e disparo de push web
- `src/lib/supabase`: clients server/browser/admin
- `src/components/brand-logo.tsx`: logotipo da PodoDesk
