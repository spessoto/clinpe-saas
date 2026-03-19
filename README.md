# ClinPe App

SaaS de podologia multi-tenant com Next.js + Supabase, incluindo onboarding, dashboard, prontuários, autoagendamento e integração com Google Calendar.

## Status do projeto

- Versão publicada: `v0.10.0`
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
- Épico 4: integração com Google Calendar + autoagendamento público por profissional em `/{professional_slug}`
- Épico 5: POPs com templates e substituição dinâmica de placeholders
- Agenda: calendário mensal de consultas lido do banco de dados, com pop-up de dados do paciente e ações de confirmação/cancelamento
- Confirmação e cancelamento de agendamento: profissional pode confirmar ou cancelar cada consulta diretamente na agenda, com notificação por e-mail assíncrona (fila persistente)
- Notificação por e-mail: envio SMTP com template HTML responsivo (nodemailer) informando data, clínica, profissional e próximo passo
- Cancelamento remove automaticamente o evento do Google Calendar do profissional
- Configurações white-label: perfil, nome da clínica, e-mail/nome do usuário, dias e horários de atendimento, duração da consulta e integração Google
- **Ficha completa do paciente**: CPF, RG, e-mail, endereço, ocupação, contato de emergência, fonte de captação
- **Histórico de Saúde no cadastro**: diabetes (tipo + insulina), vascular, coagulação, oncológico, medicamentos contínuos, alergias, fumante, calçado — exibidos como alertas visuais no perfil
- **Anamnese estruturada podológica**: ficha A/B/C com triagem sistêmica, hábitos e exame físico; toggles CSS-only otimizados para tablet/luvas; snapshot JSONB por consulta para audit trail legal
- **Modelo híbrido**: dados de saúde crônicos armazenados no cadastro (dado mestre) e replicados como snapshot em cada prontuário; formulário de novo prontuário pré-preenche a partir do cadastro
- **Fluxo de retorno no prontuário**: ao iniciar nova consulta pelo detalhe do paciente, o nome fica pré-preenchido e bloqueado; formulário inclui marcador de consulta de retorno
- **Configurações de branding mais robustas**: upload e persistência de logotipo da clínica reforçados no `/settings`
- **Autoagendamento com identidade visual da clínica**: páginas públicas exibem logo da clínica no topo
- **UX mobile aprimorada**: menu drawer com overlay na área protegida e menu hambúrguer na landing page
- **Landing page comercial atualizada**: seção de planos completa (Starter, Pro, Clínica, Enterprise) com toggle mensal/anual

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

GOOGLE_CLIENT_ID=xxxxxxxx
GOOGLE_CLIENT_SECRET=xxxxxxxx
NEXT_PUBLIC_APP_URL=https://pododesk.com.br

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
```

Observacoes:

- `SUPABASE_SERVICE_ROLE_KEY` e obrigatoria para fluxos de booking publico.
- `ADMIN_EMAIL` restringe o acesso ao novo painel administrativo em `/admin`.
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` sao obrigatorias para conectar o Calendar.
- `ASAAS_API_KEY` e `ASAAS_WEBHOOK_SECRET` sao obrigatorias para billing por assinatura recorrente.
- `SMTP_*` sao obrigatorias para o envio de e-mail ao confirmar ou cancelar agendamentos. Funciona com Hostinger (porta 465), Gmail (porta 587 + senha de app) ou Resend.
- `EMAIL_QUEUE_CRON_SECRET` protege o endpoint interno `POST /api/internal/email-queue/process` para processamento da fila.

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
- `20260316000007_appointment_confirmation_email.sql` — adiciona `confirmation_status` (pending/confirmed/rejected) e `google_event_id` na tabela `appointments`
- `20260316000008_add_billing_alerts_profile.sql` — expande billing base, perfil do profissional e alertas clinicos
- `20260318000009_add_mp_billing.sql` — legado da fase Mercado Pago
- `20260318000010_asaas_transition_and_hard_lock.sql` — transicao para Asaas e endurecimento do hard lock por assinatura/trial
- `20260318000011_admin_panel_foundation.sql` — fundacao do painel admin, free permanente, extensao manual de trial e audit log
- `20260319000020_email_queue.sql` — fila assíncrona de notificacoes de e-mail com retries
- `20260319000021_epic10_operational_finance_base.sql` — base do módulo financeiro operacional
- `20260319000022_sterilization_traceability_v2.sql` — rastreabilidade de esterilização v2
- `20260319000023_patient_extended_fields.sql` — campos administrativos do paciente: CPF, RG, e-mail, endereço, ocupação, contato de emergência, origem
- `20260319000024_patient_health_columns.sql` — colunas estruturadas de saúde no cadastro do paciente (modelo híbrido) com índices GIN em arrays
  Garanta que todas foram aplicadas no projeto Supabase antes de testar os fluxos de booking, configuracoes e Google.

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

Modo watch:

```bash
npm run test:watch
```

## Estrutura principal

- `src/app`: rotas e paginas
- `src/app/(protected)/settings`: configuracoes do profissional e agenda de atendimento
- `src/app/(protected)/agenda`: calendario de consultas sincronizadas
- `src/app/[professional_slug]`: pagina publica white-label de autoagendamento
- `src/lib/auth.ts`: guardas de autenticacao e tenant
- `src/lib/booking.ts`: regras de slots e criacao de agendamento
- `src/lib/google-calendar.ts`: OAuth e chamadas do Google Calendar (create + delete eventos)
- `src/lib/email.ts`: utilitario SMTP para envio de notificacoes ao paciente
- `src/lib/supabase`: clients server/browser/admin
- `src/components/brand-logo.tsx`: logotipo da PodoDesk
