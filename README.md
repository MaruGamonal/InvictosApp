# INVICTOS

Plataforma de gestión y descubrimiento de torneos de fútbol amateur.

## Documentación

La fuente de verdad del producto vive en [`docs/`](./docs):

- [`docs/LEEME.md`](./docs/LEEME.md) — cómo está armado el paquete y por dónde empezar.
- [`docs/documentacion/`](./docs/documentacion) — los 12 documentos del embudo (funcional → técnico), incluido el [backlog detallado](./docs/documentacion/11-backlog-detallado.md) con los 33 tickets del MVP.
- [`docs/diseno/`](./docs/diseno) — el paquete de diseño (Design System + 11 dominios + 5 flujos).
- [`docs/contexto/`](./docs/contexto) — notas fuera del embudo (monetización, revisión del handoff).

Ante cualquier duda sobre una regla de negocio, manda `docs/documentacion/06-reglas-negocio-y-decisiones-pendientes.md`.

## Stack

Next.js (TypeScript, App Router) + PostgreSQL, monolito con una capa de servicios separada de la interfaz — un servicio por caso de uso, agrupados por dominio (`docs/documentacion/10-especificacion-tecnica.md`, sección 2.1).

```
src/
  services/   un archivo por caso de uso, en carpetas por dominio — nunca importa de app/
  db/         cliente de base de datos
  lib/        contexto, firma de servicio, utilidades
  app/        rutas de Next.js — la única capa que puede importar servicios
db/migrations/  migraciones versionadas (node-pg-migrate)
```

## Desarrollo

```bash
cp .env.example .env      # completar DATABASE_URL (Postgres local o Supabase)
npm install
npm run migrate:up        # aplica el esquema
npm run dev
```

Comandos útiles:

- `npm run verify` — formato, lint, tipos y tests en un solo paso.
- `npm run migrate:create -- nombre` — crea una migración nueva.
- `npm run migrate:up` / `migrate:down` — aplica / revierte migraciones.
