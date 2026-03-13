# PodoClin App

Base inicial do SaaS de podologia com Next.js, Tailwind CSS v4, shadcn/ui, Supabase e testes com Vitest.

## Requisitos locais

- Node.js LTS (recomendado: 24.x)
- npm 10+

## Instalar dependencias

```bash
npm install
```

No PowerShell do Windows, se houver bloqueio de script no `npm`, use:

```bash
npm.cmd install
```

## Variaveis de ambiente

1. Crie um arquivo `.env.local` na raiz do projeto.
2. Copie os valores de `.env.example`.
3. Preencha com as chaves do seu projeto Supabase.

Exemplo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxx
```

## Rodar em desenvolvimento

```bash
npm run dev
```

Aplicacao em `http://localhost:3000`.

## Rodar lint

```bash
npm run lint
```

## Rodar testes

```bash
npm run test
```

Modo watch:

```bash
npm run test:watch
```

## Estrutura inicial

- `src/app`: rotas App Router
- `src/lib/supabase`: clients browser/server para Supabase
- `src/lib/env.ts`: validacao de variaveis de ambiente com Zod
- `src/test`: setup de testes

## Proximo passo sugerido

Implementar o Epico 1 (Onboarding/Auth) com:

- fluxo de sign up
- criacao de tenant no primeiro cadastro
- bloqueio de trial expirado
