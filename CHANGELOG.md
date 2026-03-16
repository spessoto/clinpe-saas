# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
