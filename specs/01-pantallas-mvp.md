# SPEC 01 — Pantallas visuales del MVP de Arcade Vault

> **Status:** Implemented
> **Date:** 2026-09-18
> **Objective:** Implementar la capa visual de las 5 pantallas de Arcade Vault (Biblioteca, Detalle, Reproductor, Auth, Salón de la Fama) como rutas reales de Next.js App Router, sin implementar ningún juego real.

## Por qué existe este spec

Las pantallas ya existen como prototipo estático en `references/templates/` (React vía CDN, sin build, con hash-routing manual y `localStorage` para estado). Este spec define cómo migrar ese prototipo al proyecto Next.js 16 real (App Router, TypeScript, rutas del servidor) sin arrastrar el patrón de hash-routing ni implementar la lógica de ningún juego.

## Scope

**In:**

- Ruteo real de Next.js App Router para las 5 pantallas: `/` (Biblioteca), `/juegos/[id]` (Detalle), `/juegos/[id]/jugar` (Reproductor), `/auth` (Auth), `/salon-de-la-fama` (Salón de la Fama).
- Componente de navegación (`Nav`) persistente en el layout raíz, con link activo según la ruta actual, contador de créditos decorativo, botón de sesión (nombre de usuario o "Iniciar sesión") y menú móvil (hamburguesa + panel deslizante), portado de `references/templates/nav.jsx`.
- Biblioteca: hero con título, buscador por nombre, chips de categoría (`TODOS/ARCADE/PUZZLE/SHOOTER/VERSUS`), grid de tarjetas de juego con efecto tilt al pasar el mouse, estado "sin resultados".
- Detalle: portada, tags, descripción, franja de estadísticas (partidas, mejor puntuación global, dificultad), botones "Jugar ahora" / "Volver al vault", tabla de mejores puntuaciones del juego.
- Reproductor: HUD (jugador, puntuación, vidas, nivel), pantalla tipo CRT con escena de juego simulada en CSS (nave, enemigos, grid animada), botones pausa/fin/salir, modal de fin de partida con input de iniciales y botón "Guardar puntuación", mensaje de confirmación, botones "Jugar de nuevo" / "Volver al vault". La partida es una simulación falsa (la puntuación sube sola por temporizador) — no hay lógica real de ningún juego.
- Auth: tarjeta con tabs "Iniciar sesión" / "Crear cuenta", formulario (usuario, contraseña, y correo sólo en la tab de registro), botón "Jugar como invitado", botones sociales decorativos (Google/GitHub, sin OAuth real).
- Salón de la Fama: tabs por juego, podio (2º/1º/3º), tabla completa de posiciones, fila destacada "tu mejor marca" cuando hay un usuario logueado.
- Estado de sesión falso (usuario logueado) y guardado de puntajes al finalizar una partida, persistidos en `localStorage` (`av_user`, `av_scores`), sin backend real.
- Migración de los datos mock (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) de `references/templates/data.jsx` a `lib/data.ts` en TypeScript.
- Diseño responsive, con los mismos breakpoints ya presentes en `references/templates/styles.css` (portados a `app/globals.css`).

**Out of scope (para specs futuras):**

- Lógica real de cualquiera de los 8 juegos (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Autenticación real (backend, OAuth de Google/GitHub, validación de credenciales, creación de cuentas persistente).
- Persistencia de puntajes en un backend/base de datos real o sincronización entre dispositivos.
- Sistema de créditos/monedas funcional (el contador "CRÉDITOS · 03" del nav es decorativo).
- Multijugador o partidas en tiempo real (el "2 jugadores" mencionado en Duelo Pixel es sólo copy de la ficha).
- Tests automatizados (no hay test runner configurado en el repo).

## Data model

```ts
// lib/types.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // sufijo de clase CSS, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/yyyy
}

export interface User {
  name: string;
}

export interface ScoreEntry {
  game: string; // Game["id"]
  score: number;
  name: string;
  at: number; // Date.now()
}
```

`lib/data.ts` exporta `GAMES: Game[]`, `CATS: string[]`, `PLAYERS: string[]` y `seededScores(seed: number, count?: number): ScoreRow[]`, portados tal cual (mismo copy en español) desde `references/templates/data.jsx`.

Claves de `localStorage`:

- `av_user`: JSON de `User | null`.
- `av_scores`: JSON de `ScoreEntry[]`, array append-only.

Ambas se leen/escriben únicamente desde `components/providers/user-provider.tsx` (ver plan de implementación), nunca directamente desde las pantallas.

## Implementation plan

1. Crear `lib/types.ts` con las interfaces `Game`, `ScoreRow`, `User`, `ScoreEntry` del modelo de datos.
2. Crear `lib/data.ts` portando `GAMES`, `CATS`, `PLAYERS` y `seededScores` desde `references/templates/data.jsx` a TypeScript, tipado con las interfaces del paso 1.
3. Crear `components/providers/user-provider.tsx` (`"use client"`) con un `UserContext` y un hook `useUser()` que expone `{ user, login(name), logout(), saveScore(entry) }`. El estado inicial es `user = null`; se hidrata desde `localStorage["av_user"]` en un `useEffect` (evita mismatches de hidratación SSR/cliente). `login`/`logout`/`saveScore` escriben en `localStorage["av_user"]`/`localStorage["av_scores"]`. Envolver `{children}` con `<UserProvider>` en `app/layout.tsx`.
4. Crear `components/nav.tsx` (`"use client"`) portando `references/templates/nav.jsx`: usa `usePathname()` de `next/navigation` para resaltar el link activo (Biblioteca activa en `/`, `/juegos/[id]` y `/juegos/[id]/jugar`), `useUser()` para mostrar nombre/logout o el botón "Iniciar sesión", y conserva el menú móvil. Montarlo en `app/layout.tsx`, encima de `{children}`.
5. Crear `components/game-card.tsx` portando el componente `GameCard` de `biblioteca.jsx` (incluye el efecto tilt con `onMouseMove`/`onMouseLeave`).
6. Implementar `app/page.tsx` (pantalla Biblioteca) con hero, buscador, chips de categoría y grid de `GameCard`, usando `GAMES`/`CATS` de `lib/data.ts`. Reemplaza el contenido actual del scaffold de `create-next-app`.
7. Implementar `app/juegos/[id]/page.tsx` (pantalla Detalle) portando `detalle.jsx`: portada, tags, descripción, franja de stats, acciones y leaderboard vía `seededScores`. Si el `id` no corresponde a ningún juego de `GAMES`, llamar a `notFound()` de `next/navigation`.
8. Implementar `app/juegos/[id]/jugar/page.tsx` (pantalla Reproductor, `"use client"`) portando `reproductor.jsx`: HUD, pantalla CRT simulada, pausa/fin/salir, modal de fin de partida que llama a `saveScore` de `useUser()`.
9. Implementar `app/auth/page.tsx` (pantalla Auth, `"use client"`) portando `auth.jsx`: tabs, formulario, botón de invitado y botones sociales decorativos; usa `login()` de `useUser()` y `useRouter().push("/")` para volver a la Biblioteca tras enviar.
10. Implementar `app/salon-de-la-fama/page.tsx` (pantalla Salón de la Fama, `"use client"`) portando `salon.jsx`: tabs por juego, podio, tabla completa y fila "tu mejor marca" usando `useUser()`.
11. Revisar `app/globals.css` contra `references/templates/styles.css` para confirmar que no falten selectores usados por las pantallas nuevas (la mayoría ya fue portada al layout actual) y agregar los que falten.
12. Recorrer manualmente las 5 rutas con `npm run dev`, confirmar que `npm run build` termina sin errores y que la consola del navegador no muestra errores.

## Acceptance criteria

- [ ] `/` muestra el hero, el buscador, los chips de categoría y las 8 tarjetas de `GAMES`.
- [ ] Escribir en el buscador de la Biblioteca filtra las tarjetas por título en tiempo real.
- [ ] Seleccionar un chip de categoría distinto de "TODOS" filtra las tarjetas por esa categoría.
- [ ] Buscar un texto sin coincidencias muestra el estado "NO HAY RESULTADOS".
- [ ] Click en una tarjeta o en su botón "JUGAR" navega a `/juegos/[id]` con el `id` correcto.
- [ ] `/juegos/[id]` muestra portada, tags, descripción, stats y un leaderboard de 10 filas para un juego existente.
- [ ] `/juegos/id-inexistente` responde con la página 404 de Next.js.
- [ ] El botón "JUGAR AHORA" en Detalle navega a `/juegos/[id]/jugar`.
- [ ] En `/juegos/[id]/jugar`, la puntuación del HUD aumenta automáticamente cada ~220ms mientras no está en pausa ni terminó la partida.
- [ ] El botón "PAUSA" detiene el incremento de puntuación y cambia su texto a "REANUDAR".
- [ ] El botón "FIN" abre el modal de fin de partida con la puntuación final.
- [ ] Guardar la puntuación en el modal escribe una entrada en `localStorage["av_scores"]` y muestra el mensaje de confirmación.
- [ ] `/auth` permite alternar entre las tabs "Iniciar sesión" y "Crear cuenta", mostrando el campo de correo sólo en "Crear cuenta".
- [ ] Enviar el formulario de Auth (o "Jugar como invitado") guarda el usuario en `localStorage["av_user"]` (o lo deja `null` para invitado) y navega a `/`.
- [ ] Con un usuario logueado, el nav muestra su nombre en vez del botón "Iniciar sesión"; al hacer click cierra sesión y limpia `localStorage["av_user"]`.
- [ ] Recargar la página después de iniciar sesión conserva el usuario logueado (persistencia vía `localStorage`).
- [ ] `/salon-de-la-fama` muestra tabs por cada juego de `GAMES`, un podio de 3 puestos y una tabla con 12 filas para el juego seleccionado.
- [ ] Con un usuario logueado, `/salon-de-la-fama` muestra la fila "TU MEJOR MARCA EN [juego]" al final de la tabla; sin usuario, esa fila no aparece.
- [ ] El link "Biblioteca" del nav queda resaltado como activo en `/`, `/juegos/[id]` y `/juegos/[id]/jugar`.
- [ ] En viewport móvil (<840px), el nav muestra el botón de hamburguesa y el panel deslizante con los mismos links.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** rutas reales de Next.js App Router en vez del hash-routing de la referencia — es lo idiomático en App Router y habilita URLs compartibles y 404 reales.
- **Sí:** `/` renderiza directamente la Biblioteca (sin una ruta `/biblioteca` duplicada ni landing separada), igual que la ruta por defecto de la referencia.
- **Sí:** slugs en español (`/juegos/[id]`, `/salon-de-la-fama`) para mantener consistencia con el copy del producto.
- **Sí:** persistencia de sesión falsa y de puntajes en `localStorage` (`av_user`, `av_scores`), igual que la referencia — sigue siendo "solo visual" porque no hay backend detrás.
- **Sí:** simulación falsa de partida en el Reproductor (puntaje que sube solo) como mockup de demostración, ya que este spec explícitamente no implementa ningún juego real.
- **Sí:** adoptar el sistema visual retro-neón completo (Press Start 2P + JetBrains Mono, paleta neón, efectos CRT) como diseño real del producto, reemplazando Geist — ya estaba parcialmente portado en `app/layout.tsx` / `app/globals.css` por un commit previo del repo.
- **Sí:** portar `GAMES` / `PLAYERS` / `seededScores` tal cual desde `data.jsx`, sin inventar contenido nuevo.
- **Sí:** usar `notFound()` de Next.js cuando el `id` de un juego no existe en `/juegos/[id]`, en vez de renderizar `null` como hacía la referencia — mejor UX y consistente con App Router.
- **No:** una librería de estado global (Redux, Zustand) para el usuario — un React Context simple (`UserProvider`) alcanza para el alcance de este MVP visual.
- **No:** botones sociales (Google/GitHub) funcionales — quedan decorativos, sin OAuth, por estar fuera de alcance.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` deshabilitado (modo privado del navegador) | La sesión y los puntajes simplemente no persisten entre recargas; la UI sigue funcionando en memoria durante la sesión activa. |
| Hidratación distinta entre servidor y cliente para el usuario logueado (el servidor no conoce `localStorage`) | `UserProvider` arranca con `user = null` en el render del servidor y lo hidrata en un `useEffect` del lado del cliente, evitando mismatches de hidratación. |

## Lo que **no** está en este spec

- Lógica real de ningún juego (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Autenticación real, backend o base de datos.
- Sistema de créditos/monedas funcional.
- Multijugador o partidas en tiempo real.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
