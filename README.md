# PodoDesk Blog Studio

Sanity Studio do blog PodoDesk, conectado ao projeto `mzldy58m` no dataset `production`.

## Requisitos

- Node.js 20+
- npm
- Sanity CLI autenticado (`npx sanity login`)

## Comandos

- `npm run dev`: roda o Studio localmente
- `npm run build`: gera build de producao
- `npm run deploy`: publica no hostname oficial `pododesk-blog.sanity.studio`

## Configuracao de projeto

- `projectId`: `mzldy58m`
- `dataset`: `production`
- `studio name` (slug): `pododesk-blog`
- `deployment.appId`: `zq9k33uastnb6p9skblzsnzn`

## Fluxo de release

1. Atualize schemas e arquivos necessarios.
2. Atualize `package.json` com a nova versao SemVer.
3. Atualize `CHANGELOG.md` com os itens da release.
4. Execute `npm run deploy`.
5. Commit e tag:

```bash
git add .
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "release: vX.Y.Z"
```

## Nota sobre Supabase

As migrations do Supabase ficam no repositorio `clinpe-app` (pasta `supabase/migrations`).
