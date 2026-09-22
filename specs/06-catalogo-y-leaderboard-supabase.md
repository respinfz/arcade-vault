# SPEC 06 — Catálogo de juegos y leaderboard real en Supabase

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 04, SPEC 05
> **Date:** 2026-09-21
> **Objective:** Migrar el catálogo de juegos (`GAMES`) y el leaderboard (hoy `seededScores` mock + `localStorage["av_scores"]`) a dos tablas reales de Supabase (`av_games`, `av_scores`), para que Biblioteca, Inicio, Detalle y Salón de la Fama lean y escriban datos reales en vez de datos hardcodeados/mock.

## Por qué existe este spec

SPEC 04 dejó la plomería de Supabase lista (clientes de navegador/servidor, CLI enlazado) pero sin ninguna tabla, explícitamente esperando "el spec que las necesite". SPEC 05 volvió a confirmar que el leaderboard de Detalle y Salón de la Fama sigue mostrando `seededScores` (datos inventados con una semilla determinística) mientras que las partidas ya guardan puntajes reales en `localStorage["av_scores"]` que ninguna pantalla lee. Este spec cierra esa brecha: crea las tablas `av_games` y `av_scores`, migra el catálogo hardcodeado de `lib/data.ts` a `av_games`, y conecta el guardado/lectura de puntajes reales a `av_scores`, reemplazando tanto el mock (`seededScores`) como el guardado en `localStorage`.

## Scope

**In:**

- Crear la tabla `av_games` en Supabase (una fila por juego del catálogo, mismas columnas que la interfaz `Game` ya usada en el código) y sembrarla con los 8 juegos que hoy están hardcodeados en `GAMES` (`lib/data.ts`), incluyendo `asteroides` (SPEC 05).
- Crear la tabla `av_scores` en Supabase (un puntaje guardado por fila, referenciando `av_games`) con RLS abierto: cualquiera puede leer (`SELECT`) e insertar (`INSERT`) un puntaje, igual de "confiable" que el `localStorage` editable de hoy — no hay autenticación real todavía.
- Migrar `app/page.tsx` (Inicio) y `app/biblioteca/page.tsx` (Biblioteca) de leer `GAMES` estático a leer `av_games` desde un Server Component, dividiendo cada uno en un Server Component (fetch) + Client Component (interactividad: buscador, chips de categoría, animaciones) que recibe los juegos como prop.
- Migrar `app/juegos/[id]/page.tsx` (Detalle, ya Server Component) de `seededScores` a un leaderboard real: top 10 puntajes de `av_scores` para ese juego, ordenados por puntaje descendente. "Mejor global" muestra el máximo puntaje real si existe al menos uno, o el valor decorativo `av_games.best` si el juego todavía no tiene ningún puntaje real guardado. "Partidas" sigue siendo el valor decorativo `av_games.plays` (no hay forma de contar partidas jugadas, solo puntajes guardados).
- Migrar `app/juegos/[id]/jugar/page.tsx` (Reproductor) de buscar el juego en `GAMES` client-side a recibirlo desde un Server Component padre que hace `notFound()` si el `id` no existe en `av_games`.
- Migrar `saveScore` de `components/providers/user-provider.tsx`: en vez de escribir en `localStorage["av_scores"]`, inserta una fila en `av_scores` (`game_id`, `name`, `score`) vía el cliente de navegador de Supabase (`lib/supabase/client.ts`). `av_user` (la sesión falsa) no cambia.
- Reescribir `app/salon-de-la-fama/page.tsx`: tabs por cada juego de `av_games`, podio y tabla con los top 12 puntajes reales de `av_scores` para el juego seleccionado (vía una Server Action al cambiar de tab), y la fila "TU MEJOR MARCA" solo cuando el usuario de la sesión falsa (`useUser().user.name`) tiene al menos una fila real guardada en `av_scores` para ese juego (con su rango real calculado, no inventado).
- Estados explícitos de datos insuficientes: si un juego tiene menos de 3 puntajes reales, el podio muestra solo los puestos que existen (2º/1º/3º vacíos se omiten) más un mensaje "AÚN NO HAY PUNTAJES"; si tiene 0, la tabla completa muestra ese mismo mensaje en vez de filas vacías o rotas.
- Eliminar de `lib/data.ts` las exportaciones `GAMES`, `PLAYERS` y `seededScores` (quedan sin uso una vez migradas todas las pantallas); `CATS` se mantiene tal cual (son las categorías fijas del filtro, no datos de juegos).
- Actualizar `lib/types.ts`: quitar `ScoreRow` (formato `date: dd/mm/yyyy` propio del mock) y agregar un tipo que representa una fila real de `av_scores`.
- Helpers de lectura centralizados en `lib/supabase/queries.ts` (`getGames`, `getGameById`, `getTopScores`, `getUserBestScore`), usados por todas las pantallas del punto anterior en vez de repetir `supabase.from(...)` inline en cada página.

**Out of scope (para specs futuros):**

- Autenticación real (Supabase Auth, login/registro contra la base) — se sigue usando la sesión falsa de `UserProvider`/`localStorage["av_user"]`, confirmado explícitamente por el usuario. `av_scores.name` es texto libre, sin relación con ninguna cuenta real.
- Migrar los puntajes que ya existen hoy en `localStorage["av_scores"]` de sesiones anteriores — se descartan; el leaderboard de `av_scores` arranca vacío. Decisión explícita del usuario.
- Row Level Security granular por usuario (ej: que cada quien solo pueda insertar puntajes "propios") — no aplica sin auth real; el `INSERT` en `av_scores` queda abierto a cualquiera con la anon key, igual que hoy con `localStorage` editable desde devtools.
- Editar o borrar `av_games` desde la aplicación (agregar un juego nuevo, cambiar su copy) — la tabla se escribe solo vía migración SQL en este spec; un panel de administración es un spec futuro si hace falta.
- Contar "partidas jugadas" de verdad (`av_games.plays` sigue siendo un valor decorativo fijo, no una métrica real).
- Realtime (que el leaderboard se actualice solo sin recargar cuando otro jugador guarda un puntaje) — las pantallas leen datos frescos en cada navegación/carga, no hay suscripción en vivo.
- Cualquier lógica de juego nueva (los 8 juegos existentes, incluido Asteroides de SPEC 05, no cambian su comportamiento de juego en este spec).
- La sección "ACTIVIDAD EN VIVO" / "TOP JUGADORES · HOY" del Inicio (`app/page.tsx`, arrays `TICKER`/`TOP_PLAYERS`) — es copy de marketing decorativo separado del leaderboard real, no se conecta a `av_scores` en este spec.
- Tests automatizados — no hay test runner configurado en el repo (igual que specs anteriores).

## Data model

```sql
-- av_games: catálogo de juegos, reemplaza el array GAMES hardcodeado
create table av_games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best integer not null default 0,   -- fallback decorativo, se usa solo si av_scores no tiene filas para este juego
  plays text not null default '0'    -- decorativo, ej. "12.4K"
);

alter table av_games enable row level security;
create policy "av_games_select_public" on av_games for select using (true);
-- Sin policies de insert/update/delete: solo se escribe vía migración SQL (seed).

-- av_scores: un puntaje guardado por fila, reemplaza seededScores + localStorage["av_scores"]
create table av_scores (
  id bigint generated always as identity primary key,
  game_id text not null references av_games(id) on delete cascade,
  name text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index av_scores_game_id_score_idx on av_scores (game_id, score desc);

alter table av_scores enable row level security;
create policy "av_scores_select_public" on av_scores for select using (true);
create policy "av_scores_insert_public" on av_scores for insert with check (true);
```

```ts
// lib/types.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

// Reemplaza ScoreRow (formato de seededScores, se elimina)
export interface Score {
  id: number;
  gameId: string;
  name: string;
  score: number;
  createdAt: string;
}

export interface User {
  name: string;
}

// Argumento de saveScore(); ya no incluye "at" (created_at lo pone la base)
export interface ScoreEntry {
  gameId: string;
  score: number;
  name: string;
}
```

`av_games` se puebla en la misma migración con las 8 filas que hoy tiene `GAMES` en `lib/data.ts` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `asteroides`, `ranaria`, `duelo-pixel`), con sus valores actuales de `title`/`short`/`long`/`cat`/`cover`/`color`/`best`/`plays` tal cual, sin inventar contenido nuevo.

`localStorage["av_user"]` no cambia (sigue siendo `User | null`, sesión falsa). `localStorage["av_scores"]` deja de usarse por completo: los puntajes se guardan y se leen exclusivamente desde `av_scores`.

## Implementation plan

1. Crear la migración SQL (`npx supabase migration new av_games_av_scores`) con las dos tablas, sus policies de RLS, el índice de `av_scores` y el `insert` de las 8 filas semilla de `av_games`, según el modelo de datos de arriba.
2. Aplicar la migración al proyecto remoto (`npx supabase db push`) y confirmar con `mcp__supabase__list_tables`/`list_migrations` que `av_games` tiene 8 filas y `av_scores` existe vacía.
3. Actualizar `lib/types.ts`: quitar `ScoreRow`, agregar `Score`, ajustar `ScoreEntry` (`gameId` en vez de `game`, sin `at`).
4. Crear `lib/supabase/queries.ts` con `getGames()`, `getGameById(id)`, `getTopScores(gameId, limit)` y `getUserBestScore(gameId, name)` (best real + rango calculado, o `null` si el nombre no tiene ninguna fila para ese juego), todas usando `lib/supabase/server.ts`.
5. Actualizar `lib/data.ts`: eliminar `GAMES`, `PLAYERS` y `seededScores`; dejar `CATS` sin cambios.
6. Dividir `app/page.tsx`: crear `components/home/home-client.tsx` (`"use client"`) con todo el contenido actual salvo el fetch, y dejar `app/page.tsx` como Server Component `async` que llama a `getGames()` y le pasa el resultado como prop `games`.
7. Dividir `app/biblioteca/page.tsx` de la misma forma (`components/biblioteca/biblioteca-client.tsx` recibe `games` como prop; `page.tsx` hace el fetch).
8. Actualizar `app/juegos/[id]/page.tsx`: reemplazar `GAMES.find`/`seededScores` por `getGameById(id)` + `getTopScores(id, 10)`; "Mejor global" usa `Math.max(...scores.map(s => s.score))` si `scores.length > 0`, si no `game.best`.
9. Dividir `app/juegos/[id]/jugar/page.tsx`: el archivo pasa a ser un Server Component `async` que llama a `getGameById(id)`, hace `notFound()` si no existe, y renderiza `components/jugar/jugar-client.tsx` (`"use client"`, con toda la lógica actual del reproductor) pasándole `game` como prop en vez de buscarlo en `GAMES`.
10. Actualizar `components/providers/user-provider.tsx`: `saveScore` pasa a ser `async`, usa `createClient()` de `lib/supabase/client.ts` para insertar `{ game_id: entry.gameId, name: entry.name, score: entry.score }` en `av_scores`; se quita el bloque de `localStorage["av_scores"]`. Actualizar el `onClick` de "GUARDAR PUNTUACIÓN" en `jugar-client.tsx` para pasar `{ gameId: game.id, score, name }`.
11. Crear `lib/actions/scores.ts` (`"use server"`) con `getScoresForGameAction(gameId: string)` que devuelve `{ scores: Score[]; }` usando `getTopScores(gameId, 12)`, para que Salón de la Fama pueda recargar el leaderboard al cambiar de tab sin convertir toda la pantalla en Server Component.
12. Reescribir `app/salon-de-la-fama/page.tsx` (Server Component `async`) para obtener `getGames()` y el leaderboard inicial (`getTopScores` + `getUserBestScore` del primer juego), y `components/hall/hall-client.tsx` (`"use client"`) que recibe esos datos iniciales, mantiene el estado de la tab activa, y llama a `getScoresForGameAction` (vía `startTransition`) al cambiar de tab. El podio y la tabla renderizan solo las filas reales que haya (0 a 12); si hay menos de 3, los puestos de podio faltantes se omiten y se muestra "AÚN NO HAY PUNTAJES PARA ESTE JUEGO". La fila "TU MEJOR MARCA" solo aparece si `getUserBestScore` devuelve una fila para `user.name` en el juego actual.
13. Recorrer manualmente con `npm run dev`: Inicio y Biblioteca muestran los 8 juegos leídos de Supabase; jugar una partida (ej. Asteroides) y guardar la puntuación la persiste en `av_scores` (verificable recargando Detalle del mismo juego); Detalle muestra ese puntaje en el leaderboard y actualiza "Mejor global" si corresponde; Salón de la Fama muestra el mismo puntaje al cambiar a la tab de ese juego, con la fila "TU MEJOR MARCA" si el nombre coincide con el usuario logueado; un juego sin puntajes reales muestra el estado "AÚN NO HAY PUNTAJES". Confirmar que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] Las tablas `av_games` (8 filas) y `av_scores` (vacía) existen en el proyecto de Supabase, con RLS habilitado y las policies descritas en el modelo de datos.
- [ ] `/` y `/biblioteca` muestran las 8 tarjetas de juego leídas desde `av_games` (no desde un array hardcodeado), con buscador y chips de categoría funcionando igual que antes.
- [ ] `lib/data.ts` ya no exporta `GAMES`, `PLAYERS` ni `seededScores`; `CATS` sigue exportado sin cambios.
- [ ] `/juegos/[id]` con un juego sin puntajes reales todavía muestra "Mejor global" con el valor decorativo de `av_games.best` y el leaderboard con el mensaje de "aún no hay puntajes".
- [ ] Jugar una partida y guardar la puntuación en el modal de fin de partida inserta una fila en `av_scores` (verificable en el dashboard de Supabase o releyendo el leaderboard), y ya no escribe nada en `localStorage["av_scores"]`.
- [ ] Después de guardar un puntaje, `/juegos/[id]` del mismo juego lo muestra en el leaderboard (recargando la página) en la posición correcta según su valor, y actualiza "Mejor global" si es el más alto.
- [ ] `/salon-de-la-fama` muestra tabs por cada juego de `av_games`; cambiar de tab trae el leaderboard real de ese juego sin recargar la página completa.
- [ ] En `/salon-de-la-fama`, un juego con 0 puntajes reales muestra el mensaje "AÚN NO HAY PUNTAJES" en vez de un podio o tabla vacíos/rotos; un juego con 1 o 2 muestra solo esos puestos en el podio.
- [ ] Con un usuario logueado (sesión falsa) que ya guardó un puntaje real para el juego de la tab activa, `/salon-de-la-fama` muestra la fila "TU MEJOR MARCA" con su puntaje y rango reales; si no guardó ninguno para ese juego, la fila no aparece.
- [ ] `/juegos/[id]/jugar` con un `id` que no existe en `av_games` responde con la página 404 de Next.js.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** un solo spec para catálogo (`av_games`) y leaderboard (`av_scores`), en vez de dos specs separados — el leaderboard necesita referenciar filas de juegos (`game_id` con FK), así que comparten la misma migración de esquema. Confirmado explícitamente por el usuario.
- **Sí:** nombres de tabla con prefijo `av_` (`av_games`, `av_scores`) — consistente con las claves de `localStorage` ya usadas en el proyecto (`av_user`, `av_scores`). Confirmado explícitamente por el usuario.
- **Sí:** migrar el catálogo completo de `GAMES` a `av_games` (no solo el leaderboard) — el usuario pidió explícitamente "una tabla de juegos" además del leaderboard, y tenerlo en Supabase habilita a futuro un panel de administración sin tocar código.
- **No:** migrar los puntajes que ya existen en `localStorage["av_scores"]` de navegadores de usuarios anteriores — se descartan, `av_scores` arranca vacío. No hay forma centralizada de leer `localStorage` de todos los navegadores igual, y el volumen de datos mock perdido es insignificante. Confirmado explícitamente por el usuario.
- **Sí:** "Mejor global" en Detalle se calcula en vivo desde `av_scores` cuando hay al menos un puntaje real, con fallback al valor decorativo `av_games.best` si no hay ninguno — evita mostrar "0" o una pantalla vacía apenas se migra. "Partidas" (`av_games.plays`) sigue siendo decorativo porque no hay forma de contar partidas jugadas, solo puntajes guardados. Confirmado explícitamente por el usuario.
- **Sí:** `INSERT` público en `av_scores` (RLS abierto, sin validación server-side adicional) vía el cliente de navegador con la anon key — no hay autenticación real todavía, así que el nivel de "confianza" es el mismo que hoy con `localStorage` editable desde devtools; una Server Action con validación queda para cuando exista auth real. Confirmado explícitamente por el usuario.
- **No:** autenticación real de Supabase en este spec — se sigue usando `UserProvider`/`localStorage["av_user"]` (sesión falsa) para el nombre asociado a cada puntaje. Confirmado explícitamente por el usuario; SPEC 04 ya había dejado esto fuera de alcance.
- **Sí:** Server Components + una Server Action puntual (`getScoresForGameAction`) para el fetch de datos, en vez de que las pantallas usen el cliente de navegador con `useEffect` — evita exponer más lógica de lectura al cliente de la necesaria y mantiene el patrón ya usado en Detalle (Server Component `async`) desde SPEC 01. Confirmado explícitamente por el usuario.
- **Sí:** estados vacíos explícitos ("AÚN NO HAY PUNTAJES", podio con menos de 3 puestos, fila "TU MEJOR MARCA" oculta si no hay dato real) en vez de rellenar con `seededScores` cuando faltan datos reales — mostrar datos inventados junto a datos reales sería engañoso y contradice el propósito del spec. Confirmado explícitamente por el usuario.
- **Sí:** eliminar `GAMES`, `PLAYERS` y `seededScores` de `lib/data.ts` en vez de dejarlos como fallback — quedan sin ningún uso una vez migradas todas las pantallas, y mantenerlos "por si falla el fetch" agregaría una ruta de código no probada. Confirmado explícitamente por el usuario.
- **No:** conectar la sección decorativa "ACTIVIDAD EN VIVO" / "TOP JUGADORES · HOY" del Inicio (`TICKER`/`TOP_PLAYERS` en `app/page.tsx`) a `av_scores` — es copy de marketing estático, no se mencionó en el pedido original y ampliar el alcance ahí no tiene el mismo valor que el leaderboard real de Detalle/Salón de la Fama.
- **No:** Realtime de Supabase para que el leaderboard se actualice sin recargar — fuera de alcance por complejidad no pedida; las pantallas ya recargan datos frescos en cada navegación.

## Risks

| Riesgo                                                                                                                                                                                                                                                                                  | Mitigación                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INSERT` público en `av_scores` permite a cualquiera guardar puntajes falsos o absurdos (ej. un script que inserte 999999999 repetidamente) vía la anon key                                                                                                                             | Aceptado como decisión explícita para este spec — mismo nivel de riesgo que el `localStorage` editable de hoy. Si se vuelve un problema real, un spec futuro puede agregar límites (ej. `score` máximo razonable por juego) o mover el insert a una Server Action con validación. |
| Migrar `app/page.tsx`, `app/biblioteca/page.tsx` y `app/juegos/[id]/jugar/page.tsx` de client-only a Server Component + Client Component puede introducir mismatches de hidratación si no se separa bien el estado que depende del navegador (ej. `matchMedia`, `IntersectionObserver`) | Esos hooks (`useReveal`, detección táctil de `touch-controls.tsx`) ya viven dentro de los componentes cliente extraídos y no cambian de comportamiento; solo se mueve el `fetch` de juegos al padre Server Component.                                                             |
| Si `getScoresForGameAction` falla (red, Supabase caído) al cambiar de tab en Salón de la Fama, la pantalla podría quedar en un estado inconsistente                                                                                                                                     | Fuera de alcance manejar reintentos o mensajes de error de red específicos en este spec — el comportamiento por defecto de Next.js ante una Server Action que lanza error (boundary de error más cercano) es aceptable para este MVP.                                             |

## Lo que **no** está en este spec

- Autenticación real (Supabase Auth, login/registro contra la base).
- Migración de los puntajes que ya existen en `localStorage["av_scores"]` de sesiones anteriores.
- RLS granular por usuario o validación server-side del `INSERT` de puntajes.
- Edición/borrado de `av_games` desde la aplicación (panel de administración).
- Conteo real de "partidas jugadas".
- Realtime del leaderboard.
- Cambios a la lógica de juego de cualquiera de los 8 juegos existentes.
- La sección decorativa "ACTIVIDAD EN VIVO" / "TOP JUGADORES · HOY" del Inicio.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
