# PodoClin App

SaaS de podologia multi-tenant com Next.js + Supabase, incluindo onboarding, dashboard, prontuarios, autoagendamento e integracao com Google Calendar.

## Status do projeto

- Versao publicada: `v0.7.1`
- Rebranding aplicado: `ClinPe` -> `PodoClin`
- Repo: `https://github.com/spessoto/clinpe-saas`

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Auth, Postgres, Storage, RLS)
- Vitest + Testing Library

## Funcionalidades implementadas

- Epico 1: auth e onboarding com criacao automatica de tenant e trial
- Epico 2: dashboard com KPIs e CRUD de pacientes
- Epico 3: prontuarios com upload de imagens no Storage
- Epico 4: integracao com Google Calendar + autoagendamento publico por profissional em `/{professional_slug}`
- Epico 5: POPs com templates e substituicao dinamica de placeholders
- Agenda: calendario mensal de consultas lido do banco de dados, com pop-up de dados do paciente e acoes de confirmacao/cancelamento
- Confirmacao e cancelamento de agendamento: profissional pode confirmar ou cancelar cada consulta diretamente na agenda, acionando automaticamente um e-mail HTML ao paciente com o resultado
- Notificacao por e-mail: envio SMTP com template HTML responsivo (nodemailer) informando data, clinica, profissional e proximo passo
- Cancelamento remove automaticamente o evento do Google Calendar do profissional
- Configuracoes white-label: perfil, nome da clinica, e-mail/nome do usuario, dias e horarios de atendimento, duracao da consulta e integracao Google

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
```

Observacoes:

- `SUPABASE_SERVICE_ROLE_KEY` e obrigatoria para fluxos de booking publico.
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` sao obrigatorias para conectar o Calendar.
- `ASAAS_API_KEY` e `ASAAS_WEBHOOK_SECRET` sao obrigatorias para billing por assinatura recorrente.
- `SMTP_*` sao obrigatorias para o envio de e-mail ao confirmar ou cancelar agendamentos. Funciona com Hostinger (porta 465), Gmail (porta 587 + senha de app) ou Resend.

## Banco de dados e migrations

As migrations SQL estao em `supabase/migrations`:

- `20260312000001_epic1_onboarding_auth.sql`
- `20260312000002_epic2_dashboard_patients.sql`
- `20260312000003_epic3_storage_medical_records.sql`
- `20260312000004_epic4_epic5_booking_google_pops.sql`
- `20260313000005_professional_booking_widget.sql`
- `20260313000006_professional_settings_schedule.sql`
- `20260316000007_appointment_confirmation_email.sql` — adiciona `confirmation_status` (pending/confirmed/rejected) e `google_event_id` na tabela `appointments`

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
- `src/components/brand-logo.tsx`: logotipo da PodoClin
