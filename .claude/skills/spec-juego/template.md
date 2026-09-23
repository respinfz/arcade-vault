# Template para un spec de juego

Este archivo es la referencia que el skill `spec-juego` consulta al escribir
el spec de un juego nuevo. Especializa el `template.md` genérico de `/spec`
(mismas reglas globales: una idea por oración, nombres concretos, sin TODOs,
sin código largo) con las partes que **todo** spec de juego debe traer ya
resueltas, porque son siempre las mismas preguntas.

**No es texto para copiar verbatim.** Es la forma que el spec debe respetar,
rellenada con los nombres concretos del juego que se está definiendo.

---

## Header

```markdown
# SPEC NN — Juego: <TÍTULO>

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** YYYY-MM-DD
> **Objective:** Una sola oración. Agregar <título> jugable al catálogo, con su motor real, HUD sincronizado, controles táctiles y leaderboard en av_scores.
```

`**Depends on:** SPEC 05, SPEC 06` es fijo — todo juego con motor real se
apoya en el patrón de SPEC 05 (motor/componente/táctil) y en la
infraestructura de catálogo/leaderboard de SPEC 06.

---

## Por qué existe este spec

Una o dos oraciones: de dónde sale el juego (carpeta de
`references/started-games/` portada, o diseño nuevo) y si reemplaza alguna
tarjeta placeholder existente del catálogo.

---

## Scope

**In** (obligatorio en todo spec de juego, además de lo específico del
juego):

- Entrada nueva en `av_games` (vía migración SQL) con su `id`/`title`/copy/`cat`/`cover`/`color`/`best`/`plays`.
- Clase de cover art `.cover-<slug>` en `app/globals.css`, diseñada con `/frontend-design`.
- Motor del juego en `components/games/<slug>/engine.ts`, portado o escrito desde cero, sin variables globales de `window`/`canvas`.
- Componente `components/games/<slug>/<slug>-game.tsx` con `forwardRef` (`restart`/`forceGameOver`/controles específicos) y props de callback de score/nivel/(vidas)/game-over.
- Controles táctiles `components/games/<slug>/touch-controls.tsx`, visibles solo con `matchMedia('(pointer: coarse)')`.
- Integración con el reproductor (`components/jugar/jugar-client.tsx`) vía el registry (`components/games/registry.ts`) — se **crea** si todavía no existe, o se le **agrega la entrada** si ya existe.
- Pausa real (congela `update(dt)`, conserva el último frame) y game-over real conectado al modal "FIN DEL JUEGO" existente.

**Out of scope (para specs futuros)** — además de lo específico del juego,
recordar siempre:

- El resto de los juegos del catálogo no cambian su comportamiento actual.
- Features del `README.md` de la referencia que el `game.js` no implementa realmente (ver regla de "portar el código, no el README").
- Sonido/música, salvo que el juego de referencia ya lo traiga y el usuario pida conservarlo explícitamente.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados (no hay test runner en el repo).

---

## Data model

Dos bloques siempre presentes:

1. La fila nueva de `av_games` (SQL, formato exacto de
   `supabase/migrations/20260922025442_av_games_av_scores.sql`):

   ```sql
   insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
     ('<id>', '<TITLE>', '<short>', '<long>', '<CAT>', 'cover-<slug>', '<color>', <best>, '<plays>');
   ```

   Si reemplaza una tarjeta existente, agregar también el `delete from
av_games where id = '<id-viejo>'`.

2. La forma del motor (`score`/`lives` u equivalente/`level`/`state`), en TS,
   igual de concreta que el ejemplo de `platform-contract.md` pero con los
   nombres reales de este juego. Si el juego no tiene "vidas" en el sentido de
   Asteroids (p. ej. Tetris), decir explícitamente qué campo del motor ocupa
   ese lugar en `.player-hud`, o si esa columna del HUD se oculta/reutiliza
   con otro rótulo.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry`
de SPEC 01/06 ya alcanzan; decirlo explícitamente si es el caso.

---

## Implementation plan

Esqueleto obligatorio (numerar y ajustar detalle al juego concreto; cada paso
debe dejar el sistema funcional):

1. Migración `supabase/migrations/<timestamp>_add_game_<slug>.sql`: `insert`
   de la fila nueva en `av_games` (+ `delete` de la tarjeta placeholder si
   corresponde). Aplicar con `npx supabase db push` y confirmar con
   `mcp__supabase__list_tables`.
2. `.cover-<slug>` en `app/globals.css`, diseñada con `/frontend-design`.
3. `components/games/<slug>/engine.ts`: portar las clases/funciones del
   `game.js` de referencia (nombrarlas) a TypeScript, sin `window`/`document`
   globales, recibiendo `ctx`/`width`/`height`/`input` por constructor.
   Conservar el HUD in-canvas; quitar solo el overlay de fin de partida
   propio.
4. `components/games/<slug>/<slug>-game.tsx`: canvas, loop de
   `requestAnimationFrame`, listeners de teclado con cleanup, `forwardRef`
   con el handle del juego, props de callback.
5. `components/games/<slug>/touch-controls.tsx`: botones específicos de este
   juego, detección de `(pointer: coarse)`.
6. Integración en el reproductor:
   - **Si `components/games/registry.ts` no existe**: crearlo con
     `GameHandle`/`GameRegistryEntry` y la entrada de `asteroides` (portando
     su caso desde el `isAsteroids` actual), y reescribir
     `components/jugar/jugar-client.tsx` para consumir el registry en los
     cuatro puntos donde hoy usa `isAsteroids` (simulación falsa, `endGame`,
     `restart`, render de `.crt-screen`). El fallback de simulación falsa
     para juegos sin entrada se conserva sin cambios.
   - **Si ya existe**: agregar solo la entrada del juego nuevo.
7. Recorrido manual con `npm run dev` cubriendo el flujo completo (ver
   Acceptance criteria) y `npm run build` sin errores de TypeScript ni
   ESLint.

---

## Acceptance criteria

Base obligatoria (ampliar con lo específico del juego, nunca quitar):

- [ ] La tarjeta `<TÍTULO>` aparece en `/` y `/biblioteca` con su cover propio (`cover-<slug>`), sin clase CSS faltante.
- [ ] `/juegos/<id>` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para este juego.
- [ ] En `/juegos/<id>/jugar`, los controles de teclado mueven/accionan el juego real y el puntaje sube por el motor, no por temporizador.
- [ ] El HUD del reproductor (`.player-hud`) y el HUD in-canvas del juego muestran siempre los mismos valores, sin desincronizarse.
- [ ] La condición de fin de partida del juego abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, conserva el último frame) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real, no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "<id>", score, name }`), visible recargando `/juegos/<id>` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero aparecen los botones táctiles y controlan el juego; con mouse/teclado normal no aparecen.
- [ ] Salir de `/juegos/<id>/jugar` no deja listeners de teclado activos en `window`.
- [ ] El resto de los juegos del catálogo siguen exactamente igual (simulación falsa, sin controles táctiles).
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

---

## Decisiones tomadas y descartadas

Registrar siempre, con motivo breve:

- Origen del juego (portado de qué carpeta de `references/started-games/`, o
  diseñado desde cero) y por qué.
- Qué features del `README.md`/`CLAUDE.md` de la referencia se descartan por
  no existir realmente en `game.js` (si aplica).
- Qué campo del motor ocupa "Vidas" en el HUD, o si esa columna se oculta o
  se reutiliza para otra cosa.
- Si se crea el registry en este spec o si ya existía.
- Si reemplaza una tarjeta placeholder existente del catálogo.

---

## Risks

Tabla `| Riesgo | Mitigación |` — solo si hay riesgos no obvios (p. ej. un
juego con más estado por portar que Asteroids, o assets externos que requieren
copiarse a `public/`). Omitir si no aplica.

---

## Lo que **no** está en este spec

Repetir al final, en lista, lo mismo que ya dijo "Out of scope" — es un
refuerzo deliberado para quien solo lee el final del documento.
