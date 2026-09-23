# SPEC 09 — Juego: Snake

> **Status:** Approved
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-22
> **Objective:** Agregar Snake jugable al catálogo (reemplazando la tarjeta placeholder "SERPENTINA" por la tarjeta nueva `snake`), con su motor real diseñado desde cero, sprites de fruta reales, HUD sincronizado, controles táctiles de cruceta y leaderboard en `av_scores`.

## Por qué existe este spec

A diferencia de Asteroides, Tetris y Arkanoid, no hay ninguna carpeta en `references/started-games/` con un `game.js` de Snake para portar: el único material de referencia disponible es `references/source-assets/snake-assets/` (`fruits.png` + `sprites.js`), un atlas de 21 sprites de fruta con fondo transparente pensado para `ctx.drawImage`. Este spec diseña el motor de Snake desde cero siguiendo el contrato ya establecido por los juegos anteriores (motor sin globales, componente `forwardRef`, HUD in-canvas sincronizado con `.player-hud`), y resuelve además dos problemas nuevos que ningún juego anterior tuvo: un motor de movimiento por grilla/tick (en vez de física continua) y la carga de una imagen externa real dentro de un `<canvas>`.

La tarjeta nueva `snake` reemplaza al placeholder `serpentina` ya existente en `av_games` — cuyo copy actual ("Una serpiente de luz recorre la grilla buscando núcleos magenta...") y cuyo cover (`cover-snake`) ya describían un juego de serpiente — mismo patrón que `asteroides` reemplazó a `rocas` en SPEC 05 y `tetris` reemplazó a `caida` en SPEC 07: se retira el placeholder y se inserta una fila nueva, aunque el tema visual coincida.

## Scope

**In:**

- Reemplazar la fila `serpentina` de `av_games` por una fila nueva `snake` (vía migración SQL), con `id: "snake"`, `title: "SNAKE"`, categoría `ARCADE`, color `green` (reutilizado de `serpentina`), cover `cover-snake` (se reutiliza tal cual, ya existe en `app/globals.css` y ya representa una serpiente de luz sobre una grilla).
- Motor del juego en `components/games/snake/engine.ts`, diseñado desde cero: movimiento por grilla (20×15 celdas de 40px sobre un canvas lógico 800×600), cola de dirección (la tecla presionada cambia la dirección del siguiente tick, sin permitir revertir directamente sobre el propio cuerpo), colisión contra los cuatro bordes del tablero y contra el propio cuerpo, spawn de fruta en una celda libre al azar con un sprite aleatorio de los 21 disponibles, crecimiento de un segmento y +10 puntos por fruta comida, y subida de nivel cada 5 frutas (acorta el intervalo del tick de movimiento hasta un piso mínimo).
- Copiar `fruits.png` a `public/games/snake/fruits.png` y portar las coordenadas de `references/source-assets/snake-assets/sprites.js` (hoy un objeto `window.SPRITE_ATLAS` global) a una constante `FRUIT_ATLAS` dentro de `engine.ts`, cargando la imagen vía `new Image()` en el constructor del motor — sin depender de ningún script global ni de la carpeta `references/` en producción.
- Componente `components/games/snake/snake-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressUp()`, `pressDown()`, `pressLeft()`, `pressRight()` — los cuatro de tipo "tap", cambian la dirección de la cola una vez, igual que una tecla de flecha) y props de callback `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.
- Controles táctiles nuevos en `components/games/snake/touch-controls.tsx`: una cruceta nueva de 4 botones (▲/▼/◀/▶, todos "tap") en una clase CSS nueva (`.touch-controls-dpad`), diseñada con `/frontend-design` — no se reutiliza `.touch-controls-move` porque ese layout solo tiene 3 slots posicionados por `nth-child`, insuficientes para 4 direcciones.
- Agregar la entrada `snake` a `components/games/registry.ts` (ya existe desde SPEC 07, no se crea de nuevo) — sin `hudLivesLabel`, usa el valor por defecto `"Vidas"`.
- Pausa real: el botón "PAUSA" del reproductor congela `update(dt)` (el acumulador de tiempo del tick deja de avanzar, se conserva el último frame dibujado).
- Game over real (colisión contra borde o contra la propia cola) conectado al modal "FIN DEL JUEGO" existente. Snake tiene efectivamente una sola vida: el campo `lives` del motor vale siempre `1` mientras `state === "playing"` y no baja nunca — la columna "Vidas" de `.player-hud` sigue mostrando su rótulo estándar, con el valor fijo en 1 (o el ícono de corazón único que ya usa el reproductor para `lives === 1`).

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen con la simulación falsa, sin cambios.
- Puntaje distinto por tipo de fruta — las 21 frutas del atlas se eligen al azar solo por variedad visual, todas valen los mismos 10 puntos.
- Power-ups, obstáculos, múltiples frutas simultáneas en el tablero u otras variantes modernas de Snake — el motor implementa únicamente el Snake clásico de una sola fruta a la vez.
- Sonido/música — ningún juego anterior lo agregó todavía; se mantiene la consistencia.
- Controles táctiles por gestos (swipe sobre el canvas) — la cruceta es de botones fijos, no gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
delete from av_games where id = 'serpentina';

insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('snake', 'SNAKE', 'Crece comiendo fruta sin morder tu propia cola.', 'Guía a la serpiente por una grilla neón cazando frutas de colores. Cada bocado la alarga y acelera el ritmo del juego. Un giro en falso contra el borde o contra tu propia cola termina la partida al instante.', 'ARCADE', 'cover-snake', 'green', 7820, '9.1K');
```

`best`/`plays`/`color` reutilizan los valores decorativos que ya tenía `serpentina`, sin inventar números nuevos.

```ts
// components/games/snake/engine.ts
export interface EngineInput {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}
export type GameState = "playing" | "gameover";

export class SnakeEngine {
  score = 0;
  lives = 1; // fijo mientras state === "playing"; el HUD del reproductor muestra siempre 1
  level = 1; // sube cada 5 frutas comidas, acorta el intervalo del tick de movimiento
  state: GameState = "playing";

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {}
  forceGameOver(): void {}
  update(dt: number): void {} // acumula dt real; avanza 1 celda cuando supera el intervalo del tick actual
  draw(): void {} // grilla + serpiente + fruta (sprite del atlas) + HUD in-canvas (SCORE/NIVEL)
}
```

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma (`GameHandle`/`GameRegistryEntry` de SPEC 07), solo recibe la entrada nueva `snake`.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_snake.sql` con el `delete from av_games where id = 'serpentina'` y el `insert` de la fila `snake` del modelo de datos de arriba. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que `serpentina` ya no existe y `snake` sí.
2. Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`.
3. Crear `components/games/snake/engine.ts`: constante `FRUIT_ATLAS` con las 21 entradas de fruta portadas de `sprites.js` (mismos `x`/`y`/`w`/`h`, referenciando `/games/snake/fruits.png` en vez de `snake-assets/fruits.png`); grilla de 20×15 celdas de 40px sobre un canvas lógico 800×600; estado de la serpiente (array de celdas `{x, y}`, dirección actual y dirección en cola), spawn de fruta en una celda libre al azar con un índice de sprite aleatorio, acumulador de tiempo en `update(dt)` que avanza la serpiente una celda cuando supera el intervalo del tick vigente (el intervalo se acorta un paso fijo cada vez que `level` sube, hasta un piso mínimo), detección de colisión contra los bordes del tablero y contra el propio cuerpo (→ `state = "gameover"`), crecimiento al comer fruta (+10 a `score`, sube `level` cada 5 frutas). `draw()` dibuja la grilla, el cuerpo de la serpiente como segmentos redondeados (color `--green`), la fruta vía `ctx.drawImage` con las coordenadas de `FRUIT_ATLAS`, y un panel in-canvas con SCORE/NIVEL. Sin `window`/`document`/canvas globales: el motor recibe `ctx`/`width`/`height`/`input` por constructor y crea su propia instancia de `Image()` para `fruits.png`.
4. Crear `components/games/snake/snake-game.tsx`: canvas `800×600`, loop de `requestAnimationFrame` (pausable con la prop `paused`, conservando el último frame dibujado), listeners `keydown`/`keyup` para `←`/`→`/`↑`/`↓` y `A`/`D`/`W`/`S` (con `preventDefault` en las flechas), agregados/quitados solo mientras el componente está montado. `forwardRef` expone `restart`, `forceGameOver`, `pressUp()`, `pressDown()`, `pressLeft()`, `pressRight()` (cada uno fija la dirección en cola, igual que su tecla equivalente). Los callbacks `onScoreChange`/`onLivesChange` (siempre `1`)/`onLevelChange`/`onGameOver` se disparan en el mismo tick que `draw()` actualiza el panel in-canvas.
5. Crear `components/games/snake/touch-controls.tsx`: cruceta de 4 botones (▲/▼/◀/▶, todos "tap" con `onPointerDown`) que llaman a `pressUp`/`pressDown`/`pressLeft`/`pressRight` del ref del paso 4. Agregar en `app/globals.css` la clase nueva `.touch-controls-dpad` (diseñada con `/frontend-design`, esquina inferior donde hoy no hay controles de otros juegos, tamaño mínimo 44×44px por botón). Detección táctil vía `matchMedia('(pointer: coarse)')`, mismo patrón que `components/games/asteroids/touch-controls.tsx`.
6. Agregar la entrada `snake` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: SnakeGame`, `TouchControls: SnakeTouchControls`, sin `hudLivesLabel`).
7. Recorrer manualmente con `npm run dev`: la tarjeta "SNAKE" aparece en Biblioteca e Inicio con `cover-snake`, y "SERPENTINA" ya no aparece; en `/juegos/snake/jugar` las flechas/WASD cambian la dirección de la serpiente, comer una fruta la alarga y suma 10 puntos, cada 5 frutas el juego se mueve más rápido (nivel sube en el HUD); chocar contra un borde o contra la propia cola abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final; "PAUSA"/"REANUDAR" congelan y continúan el juego; "FIN" abre el modal en cualquier momento; "JUGAR DE NUEVO" reinicia el motor real (serpiente de 3 segmentos al centro, puntaje 0, nivel 1); guardar la puntuación la agrega a `av_scores`; con emulación táctil en devtools aparece la cruceta de 4 botones y controla la serpiente. Confirmar que Asteroides/Tetris/Arkanoid siguen funcionando exactamente igual vía el registry, y que el resto de los juegos del catálogo sigue con la simulación falsa. Confirmar que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` ya no tiene ninguna fila con `id: "serpentina"`, y sí tiene una fila `id: "snake"` con `title: "SNAKE"`.
- [ ] `/biblioteca` y `/` (Inicio) muestran la tarjeta "SNAKE" con `cover-snake`, sin errores de clase CSS faltante, y ya no muestran "SERPENTINA".
- [ ] `/juegos/snake` (Detalle) muestra portada, copy y stats de la nueva ficha; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `snake`.
- [ ] En `/juegos/snake/jugar`, las flechas y WASD cambian la dirección de la serpiente; no es posible revertir directamente sobre el propio cuerpo (ej. ir a la derecha y presionar izquierda de inmediato no gira 180°).
- [ ] Comer una fruta hace crecer la serpiente un segmento, suma 10 puntos y hace aparecer una fruta nueva en una celda libre con un sprite del atlas.
- [ ] Cada 5 frutas comidas sube el nivel (visible en el HUD del reproductor y en el panel in-canvas) y el juego se mueve visiblemente más rápido, hasta un piso mínimo de velocidad.
- [ ] Chocar contra cualquier borde del tablero o contra el propio cuerpo abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final.
- [ ] El HUD del reproductor (`.player-hud`) y el panel in-canvas (SCORE/NIVEL) muestran siempre los mismos valores de puntaje y nivel, sin desincronizarse.
- [ ] La columna "Vidas" de `.player-hud` muestra siempre 1 durante toda la partida (nunca baja ni sube).
- [ ] El botón "PAUSA" congela el movimiento de la serpiente (el loop deja de llamar `update(dt)`) y muestra "EN PAUSA"; "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal "FIN DEL JUEGO" con el puntaje actual en cualquier momento de la partida.
- [ ] Guardar la puntuación en el modal inserta una fila `{ gameId: "snake", score, name }` en `av_scores`.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (serpiente de 3 segmentos al centro del tablero, puntaje 0, nivel 1), no solo el estado visual del HUD.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero, aparece la cruceta de 4 botones táctiles y controla la serpiente; con mouse/teclado normal no aparece.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar` y `/juegos/arkanoid/jugar` siguen funcionando exactamente igual después de agregar `snake` al registry.
- [ ] Navegar a cualquiera de los otros juegos del catálogo sin entrada en el registry muestra la misma simulación falsa que antes de este spec.
- [ ] Salir de `/juegos/snake/jugar` no deja listeners de teclado activos en `window`.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** Snake se diseña desde cero (no hay `game.js` de referencia en `references/started-games/`) — solo se reutilizan los sprites de fruta de `references/source-assets/snake-assets/`. Confirmado explícitamente por el usuario al invocar el comando.
- **Sí:** la tarjeta nueva `snake` reemplaza al placeholder `serpentina` (con un id nuevo, no se conserva `serpentina`) — mismo patrón exacto que `asteroides`/`rocas` (SPEC 05) y `tetris`/`caida` (SPEC 07), aunque el copy y el cover de `serpentina` ya describieran un juego de serpiente. Confirmado explícitamente por el usuario.
- **Sí:** se reutiliza `.cover-snake` tal cual (ya existe en `app/globals.css`) — no se crea una clase de cover nueva, ni se pasa por `/frontend-design` para el cover (sí para la cruceta táctil nueva).
- **Sí:** puntaje fijo de 10 puntos por fruta, sin importar cuál de las 21 frutas del atlas aparezca — evita inventar una tabla de 21 valores sin ninguna referencia real de balance. Confirmado explícitamente por el usuario.
- **Sí:** el nivel sube cada 5 frutas y acorta el intervalo del tick de movimiento hasta un piso mínimo — le da sentido de progresión al campo `level` que ya exige el motor, igual que Asteroides. Confirmado explícitamente por el usuario.
- **Sí:** los bordes del tablero matan (no hay envolvimiento toroidal); la colisión contra el propio cuerpo también termina la partida — es el comportamiento clásico de Snake. Confirmado explícitamente por el usuario.
- **Sí:** Snake tiene efectivamente una sola vida (`lives` fijo en `1` mientras juega) — mismo caso que Tetris, pero a diferencia de Tetris (que renombró la columna a "Líneas"), aquí se prefiere dejar la columna como "Vidas" con el valor fijo en 1, porque no hay ningún otro número de juego (como las líneas de Tetris) que tenga más sentido mostrar ahí. Confirmado explícitamente por el usuario.
- **Sí:** `update(dt)` sigue recibiendo el `dt` real y variable que ya usan Asteroides/Tetris/Arkanoid, pero el motor acumula ese tiempo internamente y solo avanza la serpiente una celda cuando el acumulador supera el intervalo del tick vigente — respeta el contrato estándar de la plataforma (`update(dt)` con tiempo real) sin introducir un modo de timing nuevo basado en conteo de frames. Confirmado explícitamente por el usuario.
- **Sí:** se copian los sprites reales de fruta (`fruits.png` a `public/games/snake/fruits.png`, coordenadas de `sprites.js` portadas a una constante TS `FRUIT_ATLAS`) en vez de dibujar la fruta como un cuadrado de color sólido — es la primera vez que un juego de la plataforma carga una imagen externa dentro del canvas; el atlas ya trae 21 sprites listos con fondo transparente. Confirmado explícitamente por el usuario.
- **Sí:** controles táctiles con una cruceta nueva de 4 botones (`.touch-controls-dpad`), diseñada con `/frontend-design`, en vez de reutilizar `.touch-controls-move` — ese layout existente solo posiciona 3 botones por `nth-child`, insuficiente para las 4 direcciones que Snake necesita. Confirmado explícitamente por el usuario.
- **Sí:** teclado con flechas y WASD simultáneamente — a diferencia de Asteroides/Tetris/Arkanoid (solo flechas), el usuario pidió explícitamente ambos esquemas para Snake.
- **No:** puntaje distinto por tipo de fruta, power-ups, obstáculos o múltiples frutas simultáneas — ninguno de estos existe en un Snake clásico y ampliar el alcance ahí no fue parte de lo pedido.
- **No:** sonido — ningún juego anterior de la plataforma lo agregó todavía, se mantiene la consistencia.

## Risks

| Riesgo                                                                                                                                                                                                          | Mitigación                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Es el primer motor de la plataforma que mueve por grilla/tick en vez de física continua por frame — riesgo de reintroducir un modo de timing distinto al resto                                                  | El acumulador de tiempo vive dentro de `update(dt)` y sigue recibiendo el `dt` real de la plataforma; no se agrega ningún parámetro ni modo de ejecución nuevo al contrato del motor (`restart`/`forceGameOver`/`update`/`draw`). |
| Cargar `fruits.png` vía `new Image()` dentro del constructor del motor es asíncrono — la fruta podría no dibujarse en los primeros frames si la imagen no cargó todavía                                         | `draw()` verifica que la imagen esté cargada (`image.complete`) antes de llamar a `ctx.drawImage`; mientras tanto se omite el sprite de fruta sin romper el resto del render (grilla y serpiente sí se dibujan igual).            |
| La cruceta táctil nueva (4 botones) es la primera clase CSS de controles táctiles que no reutiliza `.touch-controls-move`/`.touch-btn-fire` — riesgo de quedar visualmente inconsistente con los otros 3 juegos | Se diseña con `/frontend-design`, reutilizando las mismas variables de color (`--green`, etc.) y el mismo tamaño mínimo (44×44px) ya establecido por SPEC 05/07/08.                                                               |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo (`gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Puntaje distinto por tipo de fruta, power-ups, obstáculos o múltiples frutas simultáneas.
- Sonido o música.
- Controles táctiles por gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
