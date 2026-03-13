# PodoClin App

SaaS de podologia multi-tenant com Next.js + Supabase, incluindo onboarding, dashboard, prontuarios, autoagendamento e integracao com Google Calendar.

## Status do projeto

- Versao publicada: `v0.2.0`
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
- Epico 4: integracao com Google Calendar + rota publica `/{tenant_slug}/book`
- Epico 5: POPs com templates e substituicao dinamica de placeholders

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
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Observacoes:

- `SUPABASE_SERVICE_ROLE_KEY` e obrigatoria para fluxos de booking publico.
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` sao obrigatorias para conectar o Calendar.

## Banco de dados e migrations

As migrations SQL estao em `supabase/migrations`:

- `20260312_000001_epic1_onboarding_auth.sql`
- `20260312_000002_epic2_dashboard_patients.sql`
- `20260312_000003_epic3_storage_medical_records.sql`
- `20260312_000004_epic4_epic5_booking_google_pops.sql`

Garanta que todas foram aplicadas no projeto Supabase antes de testar os fluxos de booking e Google.

## Executar localmente

```bash
npm run dev
```

Aplicacao em `http://localhost:3000`.

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
- `src/lib/auth.ts`: guardas de autenticacao e tenant
- `src/lib/booking.ts`: regras de slots e criacao de agendamento
- `src/lib/google-calendar.ts`: OAuth e chamadas do Google Calendar
- `src/lib/supabase`: clients server/browser/admin
- `src/components/brand-logo.tsx`: logotipo da PodoClin
