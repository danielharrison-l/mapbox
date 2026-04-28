# Mapbox Vision

POC geoespacial em monorepo com React, Vite, NestJS, Prisma, PostgreSQL e PostGIS.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + NestJS + TypeScript
- ORM: Prisma
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
pnpm prisma:generate
pnpm dev:api
pnpm dev:web
```

Com a API rodando, o Swagger fica disponivel em `http://localhost:3000/docs`.

## Scripts principais

```bash
pnpm dev:web             # frontend
pnpm dev:api             # backend
pnpm db:up               # PostgreSQL/PostGIS
pnpm db:down             # derruba containers
pnpm prisma:generate     # gera Prisma Client
pnpm prisma:migrate:dev  # cria/aplica migrations futuras
pnpm prisma:studio       # abre Prisma Studio
pnpm lint                # lint com Biome
pnpm format              # formatacao com Biome
pnpm check               # lint + format check com Biome
pnpm build               # build em todos os packages
```

## Documentacao

- [Roadmap tecnico](docs/roadmap.md)
