# SPEC 07 — Juego: Tetris

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-22
> **Objective:** Agregar Tetris jugable al catálogo (reemplazando la tarjeta placeholder "CAÍDA"), con su motor real (piezas estándar, pieza tuerca, power-ups bomba/rayo y combo multiplicador), HUD sincronizado, controles táctiles y leaderboard en av_scores.

## Por qué existe este spec

`references/started-games/03-tetris/` trae un clon de Tetris completo (Canvas 2D + JS vanilla) cuyo `game.js` va bastante más allá de lo que documenta su propio `README.md`: además de las 7 piezas estándar implementa una pieza "tuerca" con centro hueco, dos power-ups (bomba y rayo) que aparecen cada 10 líneas, y un multiplicador de combo (hasta x5) por limpiezas consecutivas — todo verificado en el código, no solo prometido. Este es el segundo juego real que se agrega a la plataforma después de Asteroides (SPEC 05); su tablero angosto (300×600, relación 1:2) y su HUD en panel DOM (no in-canvas) son los primeros casos donde el patrón de SPEC 05 diverge, así que este spec resuelve explícitamente esas dos diferencias. La tarjeta nueva `tetris` reemplaza al placeholder `caida` ya existente en `av_games` (mismo patrón que `asteroides` reemplazó a `rocas` en SPEC 05): su copy actual ("piezas geométricas descienden... limpia líneas... velocidad aumenta cada 10 líneas") ya describe este juego.

## Scope

**In:**

- Reemplazar la fila `caida` de `av_games` por una fila nueva `tetris` (vía migración SQL), con `id: "tetris"`, `title: "TETRIS"`, categoría `PUZZLE`, color `magenta`, cover `cover-tetro` (se reutiliza tal cual, ya representa bloques de colores encastrados).
- Motor del juego en `components/games/tetris/engine.ts`, portado de `game.js`: las 7 piezas estándar, la pieza tuerca (`NUT_TYPE`, ~1/15 piezas), los power-ups bomba y rayo (`BOMB_TYPE`/`RAYO_TYPE`, uno cada 10 líneas, alternando), el combo multiplicador (hasta x5) y toda la lógica de colisión/rotación/limpieza de líneas que los sostiene (`collide`, `rotateCW`/`tryRotate` con wall kicks, `merge`, `clearLines`/`comboMult`, `explode`/`strike`/`collapseColumn`, `ghostY`, `hardDrop`/`softDrop`, `lockPiece`, `spawn`/`randomPiece`).
- Canvas lógico 800×600 (proporción 4:3, mismo tamaño que `components/games/asteroids/engine.ts`): el tablero real (300×600, 10×20 celdas de 30px) se dibuja con un margen a la izquierda, y el resto del ancho lo ocupa un panel in-canvas con SCORE / LINES / LEVEL / NEXT (vista previa de la siguiente pieza) / COMBO — nuevo patrón de HUD in-canvas para este juego, ya que el original usa un panel DOM lateral que no se porta.
- Componente `components/games/tetris/tetris-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressSoftDrop(held)`, `pressRotate()`, `pressHardDrop()`) y props de callback `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.
- Controles táctiles nuevos en `components/games/tetris/touch-controls.tsx`: `.touch-controls-move` reutilizada con ◀ mover izquierda / ▼ soft drop (ambos "mantener presionado") / ▶ mover derecha; `.touch-btn-fire` reutilizado para rotar (tap); un botón nuevo `.touch-btn-drop` (hard drop, tap), diseñado con `/frontend-design` para combinar visualmente con `.touch-btn-fire`.
- Crear `components/games/registry.ts` (no existe todavía — este es el primer spec que lo introduce): `GameHandle`, `GameRegistryEntry` (con el campo nuevo `hudLivesLabel?: string`, default `"Vidas"`) y `GAME_REGISTRY` con las entradas `asteroides` (portando el `isAsteroids` actual) y `tetris` (`hudLivesLabel: "Líneas"`).
- Reescribir `components/jugar/jugar-client.tsx` para usar `GAME_REGISTRY[game.id]` en los cuatro puntos donde hoy usa `isAsteroids` (simulación falsa, `endGame`, `restart`, render de `.crt-screen`), y para que la columna "Vidas" de `.player-hud` muestre el rótulo de `entry.hudLivesLabel` (con el valor plano, sin íconos de corazón, cuando el rótulo no es `"Vidas"`).
- Pausa real: el botón "PAUSA" del reproductor congela `update(dt)` (el motor no tiene su propio atajo de teclado P/Esc ni menú de pausa).
- Game over real (una pieza nueva colisiona al aparecer) conectado al modal "FIN DEL JUEGO" existente. A diferencia de Asteroides, Tetris no tiene un contador de vidas que baje: el jugador tiene efectivamente una sola vida, y el Game Over es inmediato en cuanto esa pieza nueva no puede aparecer — sin respawn ni vidas restantes.

**Out of scope (para specs futuros):**

- El resto de los 6 juegos restantes del catálogo (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen con la simulación falsa, sin cambios.
- Selector de skins visuales (retro/neon/pastel/pixel) — chrome decorativo con `localStorage` propio, sin valor de gameplay.
- Sonido (WebAudio sintetizado) — SPEC 05 tampoco lo agregó; se mantiene la consistencia.
- Sistema de récords propio (`localStorage["tetris-records"]`, overlay de entrada de nombre, top 5) — reemplazado por el leaderboard real (`av_scores`) y el modal "FIN DEL JUEGO" de la plataforma, mismo patrón que SPEC 05.
- Selector de "nivel inicial" del menú de pausa original — la partida siempre arranca en nivel 1.
- Tecla P/Esc de pausa propia del motor — la pausa es exclusivamente el botón del reproductor.
- Controles táctiles por gestos (swipe para mover/caer) — son botones fijos, no gestos sobre el canvas.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
delete from av_games where id = 'caida';

insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('tetris', 'TETRIS', 'Encaja piezas, limpia líneas y encadena combos explosivos.', 'Piezas geométricas caen sin descanso sobre un tablero de diez columnas. Gira, encaja y limpia líneas para escalar de nivel — cuidado con la tuerca, una pieza hueca que deja agujeros imposibles de tapar. Cada diez líneas cae un power-up: la bomba pulveriza un área 3×3 y el rayo barre una fila o columna entera. Encadena limpiezas seguidas para multiplicar tu puntaje hasta x5.', 'PUZZLE', 'cover-tetro', 'magenta', 184220, '31.8K');
```

`best`/`plays` reutilizan los valores decorativos que ya tenía `caida`, sin inventar números nuevos.

```ts
// components/games/tetris/engine.ts
export interface EngineInput {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}
export type GameState = "playing" | "gameover";

export class TetrisEngine {
  score = 0;
  lines = 0; // ocupa el lugar de "vidas" en el HUD del reproductor (rótulo "Líneas")
  level = 1;
  state: GameState = "playing";
  combo = 0; // multiplicador visible solo en el panel in-canvas, no en .player-hud

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {}
  forceGameOver(): void {}
  update(dt: number): void {}
  draw(): void {} // tablero + panel in-canvas (SCORE/LINES/LEVEL/NEXT/COMBO)
}
```

```ts
// components/games/registry.ts — extensión del registry existente
export interface GameRegistryEntry {
  Component: ForwardRefExoticComponent<
    {
      paused: boolean;
      onScoreChange(score: number): void;
      onLivesChange(lives: number): void; // para tetris recibe engine.lines
      onLevelChange(level: number): void;
      onGameOver(finalScore: number): void;
    } & RefAttributes<GameHandle>
  >;
  TouchControls?: ComponentType<{ gameRef: RefObject<GameHandle | null> }>;
  hudLivesLabel?: string; // default "Vidas"; "Líneas" para tetris
}
```

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_tetris.sql` con el `delete from av_games where id = 'caida'` y el `insert` de la fila `tetris` del modelo de datos de arriba. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que `caida` ya no existe y `tetris` sí.
2. Crear `components/games/tetris/engine.ts`: portar de `game.js` las constantes `PIECES`/`LINE_SCORES`/`COMBO_MAX_MULT`/`NUT_TYPE`/`NUT_CHANCE`/`BOMB_TYPE`/`RAYO_TYPE`/`POWER_LINES`/`BOMB_SCORE_PER_BLOCK`/`RAYO_SCORE_PER_BLOCK`, las funciones `randomPiece`, `collide`, `rotateCW`/`tryRotate`, `merge`, `comboMult`, `clearLines`, `collapseColumn`, `explode`, `strike`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, a TypeScript, sin `window`/`document`/canvas globales — recibe `ctx`/`width`/`height`/`input` por constructor. Se descartan: el overlay de game over propio, todo el sistema de récords (`loadRecords`/`saveRecords`/`addRecord`/`renderRecords`/`qualifiesForTop`), el selector de nivel inicial, `togglePause`/`pauseMenu`, el selector de skins (se usa una única paleta fija, la de `SKINS.retro`) y el audio (`audio`/`tone`/`noise`/`sweep`/`sfx*`). `draw()` pinta el tablero (izquierda) y un panel in-canvas nuevo con SCORE/LINES/LEVEL/NEXT/COMBO (derecha) dentro del canvas lógico 800×600.
3. Crear `components/games/tetris/tetris-game.tsx`: canvas `800×600`, loop de `requestAnimationFrame` (pausable con la prop `paused`, conservando el último frame dibujado), listeners `keydown`/`keyup` para `←`/`→` (mover), `↑`/`KeyX` (rotar), `↓` (soft drop mientras se mantiene) y `Espacio` (hard drop, con `preventDefault`), agregados/quitados solo mientras el componente está montado. `forwardRef` expone `restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressSoftDrop(held)`, `pressRotate()`, `pressHardDrop()`. Los callbacks `onScoreChange`/`onLivesChange` (recibe `engine.lines`)/`onLevelChange`/`onGameOver` se disparan en el mismo tick que `draw()` actualiza el panel in-canvas.
4. Crear `components/games/tetris/touch-controls.tsx`: `.touch-controls-move` con ◀ (pressLeft, mantener) / ▼ (pressSoftDrop, mantener) / ▶ (pressRight, mantener); `.touch-btn-fire` = pressRotate (tap); botón nuevo `.touch-btn-drop` = pressHardDrop (tap). Agregar en `app/globals.css` los estilos de `.touch-btn-drop` (diseñados con `/frontend-design`, junto a `.touch-btn-fire` en la esquina inferior derecha, tamaño mínimo 44×44px). Detección táctil vía `matchMedia('(pointer: coarse)')`, igual patrón que `components/games/asteroids/touch-controls.tsx`.
5. Crear `components/games/registry.ts`: `GameHandle` (`restart`/`forceGameOver`), `GameRegistryEntry` (`Component`, `TouchControls?`, `hudLivesLabel?`) y `GAME_REGISTRY` con las entradas `asteroides` (portando el caso actual de `isAsteroids`, sin `hudLivesLabel` — usa el default `"Vidas"`) y `tetris` (`hudLivesLabel: "Líneas"`).
6. Reescribir `components/jugar/jugar-client.tsx`: reemplazar `isAsteroids` por `const entry = GAME_REGISTRY[game.id]` en los cuatro puntos que hoy lo usan (el `useEffect` de simulación falsa se salta si `entry` existe; `endGame()` llama `gameRef.current?.forceGameOver()` si hay `entry`; `restart()` llama `gameRef.current?.restart()` si hay `entry`; el render dentro de `.crt-screen` usa `entry.Component`/`entry.TouchControls` en vez del ternario de `isAsteroids`). La columna "Vidas" de `.player-hud` usa `entry?.hudLivesLabel ?? "Vidas"` como rótulo; el valor se muestra como corazones (`"♥ ".repeat(...)`) solo cuando el rótulo es `"Vidas"`, y como número plano en cualquier otro caso. Juegos sin entrada en el registry siguen exactamente igual (simulación falsa, `.game-arena` decorativo, rótulo "Vidas" con corazones).
7. Recorrer manualmente con `npm run dev`: la tarjeta "TETRIS" aparece en Biblioteca e Inicio con su cover (`cover-tetro`) y "CAÍDA" ya no aparece; en `/juegos/tetris/jugar` las piezas caen, `←`/`→` mueven, `↑`/`X` rotan, `↓` acelera la caída, `Espacio` cae instantáneamente; limpiar líneas en turnos consecutivos sube el combo (visible en el panel in-canvas) y multiplica el puntaje; cada 10 líneas aparece un power-up (bomba o rayo, alternando) que destruye bloques al caer; que una pieza nueva colisione al aparecer abre el modal "FIN DEL JUEGO" automáticamente; "PAUSA"/"REANUDAR" congelan y continúan el juego; "FIN" abre el modal en cualquier momento; "JUGAR DE NUEVO" reinicia el motor real; guardar la puntuación la agrega a `av_scores`; con emulación táctil en devtools aparecen los 5 botones (◀/▼/▶/rotar/hard-drop) y controlan el juego. Confirmar que Asteroides (ahora vía el registry) sigue funcionando exactamente igual que en SPEC 05, y que el resto de los juegos del catálogo sigue con la simulación falsa. Confirmar que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` ya no tiene ninguna fila con `id: "caida"`, y sí tiene una fila `id: "tetris"` con `title: "TETRIS"`.
- [ ] `/biblioteca` y `/` (Inicio) muestran la tarjeta "TETRIS" con `cover-tetro`, sin errores de clase CSS faltante, y ya no muestran "CAÍDA".
- [ ] `/juegos/tetris` (Detalle) muestra portada, copy y stats de la nueva ficha; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `tetris`.
- [ ] En `/juegos/tetris/jugar`, `←`/`→` mueven la pieza, `↑`/`X` la rotan (con wall kicks), `↓` acelera la caída mientras se mantiene, y `Espacio` hace un hard drop instantáneo.
- [ ] La pieza tuerca aparece ocasionalmente entre las piezas normales y deja huecos con centro vacío en el tablero.
- [ ] Cada 10 líneas eliminadas aparece un power-up (bomba o rayo, alternando) que, al caer, destruye bloques del tablero y suma puntos.
- [ ] Limpiar líneas en turnos consecutivos incrementa el multiplicador de combo (hasta x5), visible en el panel in-canvas, y multiplica el puntaje de esa limpieza.
- [ ] El HUD del reproductor (`.player-hud`) muestra la columna "Líneas" (no "Vidas") con el mismo número de líneas eliminadas que el panel in-canvas (LINES), sin desincronizarse.
- [ ] Cuando una pieza nueva colisiona al aparecer, se abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final.
- [ ] El botón "PAUSA" congela la caída de piezas (el loop deja de llamar `update(dt)`) y muestra "EN PAUSA"; "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal "FIN DEL JUEGO" con el puntaje actual en cualquier momento de la partida.
- [ ] Guardar la puntuación en el modal inserta una fila `{ gameId: "tetris", score, name }` en `av_scores`.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (tablero vacío, puntaje 0, líneas 0, nivel 1), no solo el estado visual del HUD.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero, aparecen los 5 botones táctiles (◀/▼/▶/rotar/hard-drop) y controlan la pieza; con mouse/teclado normal no aparecen.
- [ ] `/juegos/asteroides/jugar` sigue funcionando exactamente igual que en SPEC 05 después de migrar su integración al registry nuevo.
- [ ] Navegar a cualquiera de los otros 6 juegos del catálogo muestra la misma simulación falsa que antes de este spec, sin controles táctiles ni motor real.
- [ ] Salir de `/juegos/tetris/jugar` no deja listeners de teclado activos en `window`.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** la tarjeta nueva `tetris` reemplaza al placeholder `caida` ya existente en `av_games` — su copy ya describía Tetris (piezas que descienden, limpieza de líneas, velocidad que aumenta cada 10 líneas), mismo patrón que `asteroides` reemplazando a `rocas` en SPEC 05. Confirmado explícitamente por el usuario.
- **Sí:** se reutiliza `.cover-tetro` tal cual (ya existe en `app/globals.css` y ya representa bloques de colores encastrados) — no se crea una clase de cover nueva.
- **Sí:** se portan la pieza tuerca, los power-ups bomba/rayo y el combo multiplicador — son mecánica de juego real implementada en `game.js` (no promesas del README), y forman el núcleo de la fórmula de puntuación de este Tetris específico; dejarlos fuera cambiaría sustancialmente el juego respecto al original. Confirmado explícitamente por el usuario.
- **No:** selector de skins visuales, sonido, sistema de récords propio (localStorage + entrada de nombre) y selector de nivel inicial — todos son chrome/persistencia propios del juego original que la plataforma ya resuelve de otra forma (paleta única, sin audio todavía en ningún juego, `av_scores` + modal "FIN DEL JUEGO", partida siempre en nivel 1). Mismo criterio que SPEC 05 de descartar lo que la plataforma ya cubre. Confirmado explícitamente por el usuario.
- **No:** tecla P/Esc de pausa propia del motor — la pausa es exclusivamente el botón "PAUSA" del reproductor, para evitar dos fuentes de verdad sobre el estado de pausa (una en React, otra dentro del motor). Confirmado explícitamente por el usuario.
- **Sí:** el HUD del reproductor reutiliza la columna "Vidas" como "Líneas" (mostrando `engine.lines`) en vez de ocultarla o dejar un valor fijo — mantiene el layout de `.player-hud` sin tocar su CSS, y evita mostrar un dato decorativo sin sentido de juego. Se agrega el campo `hudLivesLabel` al registry para que cada juego declare su propio rótulo. Confirmado explícitamente por el usuario.
- **Sí:** Tetris tiene efectivamente una sola vida — no hay un contador de vidas que descienda como en Asteroides; el Game Over es inmediato en cuanto una pieza nueva colisiona al aparecer, sin respawn. Por eso no tiene sentido mostrar un contador de "vidas" (que solo podría valer 1 o 0): se prefiere mostrar "Líneas", un dato que sí cambia durante la partida. Aclarado explícitamente por el usuario.
- **Sí:** el tablero (300×600, relación 1:2) se porta dentro de un canvas lógico 800×600 (4:3, mismo tamaño que `asteroids/engine.ts`) con un panel in-canvas nuevo (SCORE/LINES/LEVEL/NEXT/COMBO) ocupando el ancho restante, en vez de letterbox con bandas negras — evita perder NEXT/combo (que no caben en `.player-hud`, ya con sus 4 slots ocupados) y sigue el patrón de HUD in-canvas sincronizado que ya usa Asteroides. Confirmado explícitamente por el usuario.
- **Sí:** este spec crea `components/games/registry.ts` — es el primer juego que se agrega después de Asteroides, y `components/games/registry.ts` todavía no existe en el repo. Se porta el caso `isAsteroids` actual de `jugar-client.tsx` a la primera entrada del registry.
- **Sí:** controles táctiles con 5 botones (◀/▼/▶ en `.touch-controls-move`, rotar en `.touch-btn-fire`, hard-drop en un `.touch-btn-drop` nuevo) en vez de omitir el hard drop táctil — preserva las cinco acciones reales del juego original; el botón nuevo se diseña con `/frontend-design` para no generar toques accidentales con el de rotar. Confirmado explícitamente por el usuario.

## Risks

| Riesgo                                                                                                                                                                    | Mitigación                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El panel in-canvas (SCORE/LINES/LEVEL/NEXT/COMBO) es una superficie de UI nueva sin precedente en el repo — puede quedar apretado o ilegible en anchos de pantalla chicos | El canvas se escala por CSS dentro de `.crt-screen` igual que Asteroides; se prueba manualmente en el paso 7 del plan en tamaños de escritorio y con emulación móvil antes de dar el spec por terminado. |
| Portar combo + dos power-ups (bomba/rayo) es más estado que el motor de Asteroides — mayor superficie para bugs de sincronización con el HUD                              | Se porta la lógica de `clearLines`/`explode`/`strike` tal cual está probada en `game.js`, sin reescribir sus fórmulas de puntaje ni sus condiciones de disparo.                                          |
| Dos botones táctiles nuevos y cercanos (`.touch-btn-fire` para rotar, `.touch-btn-drop` para hard drop) pueden generar toques accidentales entre sí                       | Tamaño mínimo 44×44px para ambos y separación visual clara diseñada con `/frontend-design`, mismo criterio de tamaño que ya usa SPEC 05 para sus botones táctiles.                                       |

## Lo que **no** está en este spec

- El resto de los 6 juegos restantes del catálogo.
- Selector de skins visuales, sonido, sistema de récords propio y selector de nivel inicial del Tetris original.
- Tecla P/Esc de pausa propia del motor.
- Controles táctiles por gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
