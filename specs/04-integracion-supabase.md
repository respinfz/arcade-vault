# SPEC 04 — Integración base con Supabase

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-09-21
> **Objective:** Dejar el proyecto conectado a Supabase (paquetes, clientes de navegador/servidor, CLI enlazado al proyecto y una ruta de diagnóstico) sin implementar todavía ninguna feature real de auth ni de datos.

## Por qué existe este spec

El proyecto ya tiene un proyecto de Supabase creado (`htbfrannlgucmttpwnbk`, referenciado en `.mcp.json`) pero cero código de aplicación lo usa: no hay paquetes instalados, ni clientes configurados, ni CLI enlazado. Antes de poder escribir specs futuros de autenticación real (reemplazando el login falso de `UserProvider`/`localStorage`) o de persistencia de puntajes/leaderboard, hace falta esta capa de plomería. Este spec es deliberadamente angosto: solo la integración, ninguna pantalla cambia de comportamiento.

## Scope

**In:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` como dependencias de producción.
- Instalar `supabase` (CLI) como dependencia de desarrollo.
- Crear `lib/supabase/client.ts`: cliente de navegador vía `createBrowserClient` de `@supabase/ssr`, usando `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Crear `lib/supabase/server.ts`: cliente de servidor vía `createServerClient` de `@supabase/ssr`, leyendo/escribiendo cookies con `next/headers` (`cookies()`), para usarlo desde Server Components y Server Actions futuros.
- Enlazar el CLI al proyecto existente: `supabase init` (genera `supabase/config.toml` y el `.gitignore` propio de la carpeta `supabase/`) y `supabase link --project-ref htbfrannlgucmttpwnbk`, usando `SUPABASE_DB_PASSWORD` (ya presente en `.env.local`) para la autenticación del link.
- Agregar `NEXT_PUBLIC_SUPABASE_URL` (`https://htbfrannlgucmttpwnbk.supabase.co`) y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la publishable key `sb_publishable_...` del proyecto, obtenida vía MCP) a `.env.local`.
- Documentar ambas variables (sin valor) en `.env.template`, junto al comentario ya existente de `RESEND_API_KEY` y `SUPABASE_DB_PASSWORD`.
- Crear una ruta de diagnóstico `app/api/supabase-health/route.ts` (`GET`) que instancia el cliente de servidor y llama a `supabase.auth.getSession()`, devolviendo `{ ok: true }` si no hay error de conexión/credenciales, o `{ ok: false, error: string }` si lo hay. Esta ruta no se linkea desde ningún nav ni pantalla; queda como endpoint interno de verificación permanente.

**Out of scope (para specs futuros):**

- Cualquier método de autenticación (email/password, OAuth, magic link) y sus pantallas — va en un spec futuro de auth.
- `middleware.ts` / refresco de cookies de sesión — no tiene sentido sin sesiones reales; se agrega junto con el spec de auth.
- Tablas de base de datos, migraciones de esquema (`profiles`, `scores`, etc.) — van en el spec que las necesite.
- Reemplazar `UserProvider`/`localStorage` (`av_user`, `av_scores`) por Supabase — se mantienen intactos tal cual (spec 01) hasta que exista un spec de auth/datos real.
- Row Level Security (RLS) y políticas — no aplica todavía porque no hay tablas.
- Bucket de Storage, Edge Functions, Realtime — no se usan en esta integración base.

## Data model

Este spec no introduce tablas ni estructuras de datos nuevas en la base de Supabase (el proyecto remoto está vacío: `list_tables` no devuelve ninguna tabla en `public`). Los únicos "datos nuevos" son de configuración, no de dominio:

- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `supabase/config.toml`, generado por `supabase init`, sin modificaciones manuales más allá del link al proyecto.

## Implementation plan

1. Instalar dependencias: `npm install @supabase/supabase-js @supabase/ssr` y `npm install -D supabase`.
2. Agregar `NEXT_PUBLIC_SUPABASE_URL=https://htbfrannlgucmttpwnbk.supabase.co` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>` a `.env.local`, y las mismas dos claves sin valor a `.env.template`.
3. Crear `lib/supabase/client.ts` exportando una función `createClient()` que devuelve `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`.
4. Crear `lib/supabase/server.ts` exportando una función async `createClient()` que arma `createServerClient(...)` con los `cookies()` de `next/headers`, siguiendo el patrón oficial de `@supabase/ssr` para Server Components (lectura de cookies; `set`/`remove` envueltos en try/catch porque Server Components no pueden escribir cookies fuera de Server Actions/Route Handlers).
5. Correr `npx supabase init` en la raíz del repo (genera `supabase/config.toml` y `supabase/.gitignore`), y luego `npx supabase link --project-ref htbfrannlgucmttpwnbk` usando `SUPABASE_DB_PASSWORD` de `.env.local` cuando lo pida.
6. Crear `app/api/supabase-health/route.ts` con un `export async function GET()` que usa `createClient()` de `lib/supabase/server.ts`, llama a `supabase.auth.getSession()` y responde `Response.json({ ok: true })` o `Response.json({ ok: false, error: ... }, { status: 500 })` según el resultado.
7. Correr `npm run dev`, visitar `http://localhost:3000/api/supabase-health` y confirmar que responde `{ "ok": true }`. Si responde error, revisar las variables de entorno del paso 2.
8. Correr `npm run build` y confirmar que termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `npm install` deja `@supabase/supabase-js` y `@supabase/ssr` en `dependencies`, y `supabase` en `devDependencies` de `package.json`.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` existen y exportan cada uno una función `createClient()` que instancia el cliente correspondiente.
- [ ] `supabase/config.toml` existe y el proyecto está enlazado al project ref `htbfrannlgucmttpwnbk` (`npx supabase status` o `npx supabase link` no piden volver a enlazar).
- [ ] `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con valores reales; `.env.template` documenta ambas claves sin valor.
- [ ] Visitar `/api/supabase-health` en `npm run dev` devuelve `{ "ok": true }`.
- [ ] Ninguna pantalla existente (`/`, `/biblioteca`, `/auth`, `/juegos/[id]`, `/salon-de-la-fama`, `/acerca-de`) cambia de comportamiento visual ni funcional respecto a specs anteriores.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** dividir en specs — este spec es solo la integración/plomería con Supabase; auth real, manejo de perfil/username y migración de puntajes quedan para specs futuros. Confirmado explícitamente por el usuario.
- **Sí:** `@supabase/ssr` además de `@supabase/supabase-js` (no solo el cliente básico) — es el paquete oficial recomendado por Supabase para Next.js App Router y evita tener que reescribir los clientes cuando llegue el spec de auth con sesiones server-side. Confirmado explícitamente por el usuario.
- **Sí:** ruta de diagnóstico `/api/supabase-health` como verificación, y se deja permanente en el repo (no se borra al terminar el spec) — sirve para confirmar en cualquier momento que las credenciales siguen funcionando, sin estar linkeada desde ninguna pantalla. Confirmado explícitamente por el usuario.
- **No:** `middleware.ts` de refresco de sesión — sin autenticación real todavía no hay ninguna cookie de sesión que refrescar; se agrega junto con el spec de auth, cuando sí cumple una función. Confirmado explícitamente por el usuario.
- **Sí:** incluir el CLI de Supabase (`supabase init` + `supabase link`) en este spec en vez de posponerlo al primer spec con tablas — el repo ya tenía `SUPABASE_DB_PASSWORD` en `.env.local` anticipando este uso, y tenerlo enlazado desde ya deja a los specs futuros listos para correr `supabase db push` sin un paso de setup adicional. Confirmado explícitamente por el usuario.
- **Sí:** usar la publishable key nueva (`sb_publishable_...`) como valor de `NEXT_PUBLIC_SUPABASE_ANON_KEY` en vez de la legacy anon key (JWT) — el proyecto de Supabase ya expone ambas; la publishable key es el reemplazo recomendado actualmente por Supabase y es funcionalmente equivalente para uso en cliente.
- **No:** tocar `UserProvider`, `localStorage` (`av_user`/`av_scores`) o la pantalla `/auth` en este spec — siguen funcionando exactamente igual que en el spec 01 hasta que exista un spec de auth real que los reemplace.
- **No:** crear ninguna tabla, política de RLS o migración — el proyecto remoto está vacío (`list_tables` sin resultados) y no hay ningún dato que modelar todavía; se define en el spec que agregue la primera feature real sobre Supabase.

## Lo que **no** está en este spec

- Autenticación real (email/password, OAuth, magic link) y cualquier cambio a la pantalla `/auth`.
- `middleware.ts` de refresco de sesión.
- Tablas, migraciones de esquema o políticas de RLS.
- Reemplazo de `localStorage` (`av_user`, `av_scores`) por Supabase.
- Storage, Edge Functions o Realtime.

Cada uno de estos, si se implementa, va en su propio spec.
