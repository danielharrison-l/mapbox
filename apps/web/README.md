# Mapbox Vision Web

Frontend React/Vite da POC geoespacial.

## Ambiente

Crie `apps/web/.env` a partir de `apps/web/.env.example` e informe:

```env
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
VITE_API_BASE_URL=http://localhost:3000
```

## Desenvolvimento

Na raiz do monorepo:

```bash
pnpm dev:web
```

Quando alterar `vite.config.ts` ou dependencias do Vite/Tailwind, reinicie o
dev server.
