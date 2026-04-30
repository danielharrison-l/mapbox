# Mapbox Vision

POC geoespacial em monorepo com React, Vite, NestJS, TypeORM, PostgreSQL e PostGIS.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + NestJS + TypeScript
- ORM: TypeORM
- Banco: PostgreSQL + PostGIS
- Workspace: pnpm
- Ambiente local: Docker Compose

## Estrutura

```txt
apps/
  api/        Backend NestJS
  web/        Frontend React/Vite
packages/
  shared/     Tipos e constantes compartilhados
docker/       Configuracoes auxiliares de infraestrutura local
docs/         Documentacao da POC
```

## Primeiros passos

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm db:up
pnpm db:seed:geo
pnpm dev:api
pnpm dev:web
```

Com a API rodando, o Swagger fica disponivel em `http://localhost:3000/docs`.

## Seed geoespacial

O seed geoespacial reseta os dados de `municipality`, `infrastructure_point` e
`meteorology_asset`, recriando a massa mockada da POC com 90 estacoes
meteorologicas, pontos georreferenciados e poligonos de cobertura.

Use quando quiser restaurar a massa mockada mesmo que o banco ja tenha dados:

```bash
pnpm db:seed:geo
```

Tambem e possivel rodar diretamente pelo workspace da API:

```bash
pnpm --filter @mapbox-vision/api seed:geo
```

## Scripts principais

```bash
pnpm dev:web             # frontend
pnpm dev:api             # backend
pnpm db:up               # PostgreSQL/PostGIS
pnpm db:down             # derruba containers
pnpm db:seed:geo         # reseta e recria os 90 ativos mockados da POC
pnpm db:migration:generate # gera uma migration TypeORM
pnpm db:migration:show     # lista migrations TypeORM
pnpm db:migration:run      # aplica migrations TypeORM
pnpm db:migration:revert   # reverte a ultima migration TypeORM
pnpm lint                # lint com Biome
pnpm format              # formatacao com Biome
pnpm check               # lint + format check com Biome
pnpm build               # build em todos os packages
```

## Documentacao

- [Roadmap tecnico](docs/roadmap.md)
