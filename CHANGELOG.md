# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-03-16

### Fixed

- Widget "Última consulta" em `/patients/[id]` agora considera `created_at` de prontuários (`medical_records`), não apenas agendamentos. A data exibida é a mais recente entre prontuários e agendamentos.

## [0.3.0] - 2026-03-15

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

[0.3.1]: https://github.com/spessoto/clinpe-saas/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/spessoto/clinpe-saas/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/spessoto/clinpe-saas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/spessoto/clinpe-saas/releases/tag/v0.1.0
