# SPEC 10 — Juego: INVASORES

> **Status:** Approved
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-23
> **Objective:** Agregar INVASORES jugable al catálogo como Space Invaders con fuego rápido limitado por sobrecalentamiento y un multiplicador x1–x5 por racha de aciertos, reemplazando la simulación falsa del placeholder `invasores` por un motor real diseñado desde cero, con HUD sincronizado, controles táctiles ◀/▶ + FUEGO y leaderboard en `av_scores`.

## Por qué existe este spec

Este spec sale de la game jam de Arcade Vault para el juego **INVASORES** (estilo Space Invaders), sin tema impuesto: la ambientación es la estética neón/CRT de la plataforma. Retoma la sugerencia `invasores` del agente `game-planner` (`references/game-suggestions-to-do.md`, 32/35, esfuerzo M, estado "recomendado": "puntaje por alien + OVNI, oleadas infinitas; táctil ◀/▶ + FUEGO reutiliza el layout de Asteroides; sin assets, dibujo procedural").

La tarjeta `invasores` ya existe en `av_games` ("INVASORES — Defiende el planeta de filas alienígenas", `SHOOTER`, cover `cover-invaders`, color `green`) pero hoy corre la simulación falsa de puntaje del reproductor. Este spec la reemplaza por el juego real, con el patrón de SPEC 05 (motor/componente/táctil) y SPEC 06 (catálogo/leaderboard). El `id` nuevo coincide con el del placeholder (`invasores`), así que la migración hace `delete` + `insert` del mismo `id`.

No hay material en `references/started-games/` ni en `references/source-assets/` para este juego: el motor se diseña desde cero y todo se dibuja en código.

**Esta variante (B) es la del twist:** conserva la formación, los escudos, el OVNI y las 3 vidas del clásico (variante A), pero cambia la tensión del disparo. El cañón puede disparar en ráfaga (hasta 3 balas en pantalla), pero cada disparo calienta el cañón y al llegar al 100% queda bloqueado 1,6 s. Cada acierto consecutivo alimenta una racha que multiplica el puntaje hasta x5, y cualquier disparo fallado la corta. El resultado es un dilema constante entre spamear para sobrevivir y apuntar para puntuar, que separa mejor a los jugadores en el leaderboard. La variante A es el clásico de una bala; la variante C agrega tipos de alien, jefe nodriza, power-ups y bomba. Las tres comparten el `game-id` `invasores`, así que son **mutuamente excluyentes**: se implementa solo una.

## Scope

**In:**

- Reemplazar la fila `invasores` de `av_games` por una fila nueva con el mismo `id` (vía migración SQL: `delete` + `insert`), con `title: "INVASORES"`, categoría `SHOOTER`, cover `cover-invasores`, y los valores decorativos del placeholder (`color: green`, `best: 54190`, `plays: "18.0K"`). `short`/`long` nuevos, que describen racha y sobrecalentamiento.
- Reemplazar la clase `.cover-invaders` de `app/globals.css` por una clase nueva `.cover-invasores` (formación de invasores en neón verde/cyan/magenta, un cañón con el cañón al rojo y tres trazos de disparo en ráfaga), diseñada con `/frontend-design`.
- Motor del juego en `components/games/invasores/engine.ts`, diseñado desde cero, sin variables globales de `window`/`document`/canvas: todo lo del clásico (formación 5×11 con marcha acelerada, escudos destructibles, OVNI, disparos enemigos, vidas, oleadas infinitas) más fuego en ráfaga con calor, bloqueo por sobrecalentamiento, racha y multiplicador, y bonus de oleada.
- Canvas lógico 800×600 (4:3), con fondo negro, estrellas estáticas tenues y una línea de suelo verde neón.
- HUD in-canvas en una franja superior de 40px (SCORE + multiplicador `xN` a la izquierda, OLEADA al centro, VIDAS a la derecha) y una barra de CALOR vertical junto al cañón, sincronizado con `.player-hud`.
- Componente `components/games/invasores/invasores-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressFire(held)`) y props de callback `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.
- Controles táctiles `components/games/invasores/touch-controls.tsx`: ◀/▶ ("mantener presionado") en los slots 1 y 3 de `.touch-controls-move` (relleno `<div aria-hidden>` en el slot 2, igual que Arkanoid) y `.touch-btn-fire` ("FUEGO", mantener presionado). Visibles solo con `matchMedia('(pointer: coarse)')`. No se agrega CSS de controles nuevo.
- Agregar la entrada `invasores` al registry existente `components/games/registry.ts`, sin `hudLivesLabel` (usa `"Vidas"`, con corazones).
- Pausa real (congela `update(dt)`, conserva el último frame, incluido el enfriamiento del cañón) y game over real (sin vidas, o la formación alcanza la línea de invasión) conectado al modal "FIN DEL JUEGO" existente.
- Agregar la sección de INVASORES a `references/implemented-games.md`.

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo (`gloton`, `ranaria`, `duelo-pixel`) siguen con la simulación falsa; `asteroides`, `tetris`, `arkanoid` y `snake` no cambian.
- Tipos de alien especiales, jefes, power-ups y bomba (ver variante C).
- Mejoras permanentes del cañón (menos calor, más balas) entre oleadas.
- El truco del OVNI del arcade original por conteo de disparos.
- Sonido/música.
- Sprites o imágenes externas.
- Pantalla de inicio propia, pausa propia (P/Esc) y récord local en `localStorage`.
- Controles táctiles por gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
-- Reemplaza el placeholder "invasores" (simulación falsa) por el juego real con el mismo id.
delete from av_games where id = 'invasores';

insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('invasores', 'INVASORES', 'Dispara en ráfaga, no te sobrecalientes, encadena aciertos.', 'Cincuenta y cinco invasores de neón marchan en formación y bajan cada vez que tocan un borde. Tu cañón dispara en ráfaga, pero cada disparo lo calienta: al 100% se bloquea y quedas a merced del fuego enemigo. Encadena aciertos sin fallar para multiplicar tu puntaje hasta x5, derriba el OVNI y resiste oleada tras oleada.', 'SHOOTER', 'cover-invasores', 'green', 54190, '18.0K');
```

`color`/`best`/`plays` reutilizan los valores del placeholder. El `delete` borra en cascada (`on delete cascade`) las filas de `av_scores` con `game_id = 'invasores'` que haya dejado la simulación falsa.

```ts
// components/games/invasores/engine.ts
export interface EngineInput {
  keys: Record<string, boolean>; // ArrowLeft/KeyA, ArrowRight/KeyD, Space (mantener)
  justPressed: Record<string, boolean>;
}
export type GameState = "playing" | "dying" | "waveClear" | "gameover";
export type AlienKind = "calamar" | "cangrejo" | "pulpo"; // 30 / 20 / 10 puntos base

export class InvasoresEngine {
  score = 0;
  lives = 3; // "Vidas" en .player-hud (corazones); +1 cada EXTRA_LIFE_EVERY puntos, máx. 5
  level = 1; // número de oleada, "Nivel" en .player-hud
  state: GameState = "playing";
  heat = 0; // 0..100, solo en la barra CALOR in-canvas
  overheated = false; // true durante OVERHEAT_LOCK: no se puede disparar
  streak = 0; // aciertos consecutivos, solo in-canvas
  multiplier = 1; // 1..5, solo in-canvas junto al SCORE

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // oleada 1, 3 vidas, puntaje 0, calor 0, racha 0, x1
  forceGameOver(): void {} // state = "gameover", conserva score
  update(dt: number): void {} // dt en segundos, clampeado a 0.05
  draw(): void {} // fondo + escudos + formación + OVNI + balas + cañón + barra CALOR + HUD in-canvas
}
```

Constantes compartidas con el clásico (canvas lógico 800×600, velocidades en px/s):

- Formación: `ALIEN_COLS = 11`, `ALIEN_ROWS = 5`, celda de `48×40`, alien de `33×24` (bitmap de 11×8 a escala 3). Fila 0 = `calamar` (30, magenta), filas 1–2 = `cangrejo` (20, cyan), filas 3–4 = `pulpo` (10, verde). Origen `x = 136`, `y = 100 + 20 × min(level − 1, 4)`.
- Marcha: paso `STEP_X = 8`; intervalo = `lerp(0.03, 0.55, vivos / 55) / (1 + 0.08 × (level − 1))`; al tocar `[16, 784]` baja `STEP_Y = 16` e invierte.
- Cañón: `44×20` en `y = 540`, `PLAYER_SPEED = 300`, `x` en `[30, 770]`.
- Balas enemigas: `min(240 + 15 × (level − 1), 400)` px/s, máximo `min(3 + floor(level / 2), 6)`, temporizador de 0.5–1.2 s escalado por `max(0.5, 1 − 0.05 × (level − 1))`, disparadas por el alien más bajo de una columna (1/3 de las veces, la más cercana al cañón). Bala propia contra bala enemiga destruye ambas.
- Escudos: 4, en `x = 160, 320, 480, 640`, borde superior `y = 440`, grilla de `11×8` celdas de `6px` en arco; cada impacto borra la celda y hasta 2 vecinas; se regeneran cada oleada.
- Línea de invasión `INVASION_Y = 520`: alcanzarla termina la partida.
- OVNI: cada 20–30 s si quedan ≥ 8 aliens, cruza `y = 60` a `120` px/s; valor base al azar de `[50, 100, 150, 300]`.
- `DYING_TIME = 1.2` s, `WAVE_CLEAR_TIME = 1.5` s, ambos avanzan solos.

Constantes propias de esta variante:

- Fuego: `MAX_PLAYER_BULLETS = 3`, `FIRE_COOLDOWN = 0.18` s entre disparos, `PLAYER_BULLET_SPEED = 600`. Mantener `Space` dispara cada vez que el cooldown lo permite.
- Calor: `HEAT_PER_SHOT = 14`, enfriamiento `HEAT_COOL_RATE = 35` por segundo (siempre activo). Si `heat ≥ 100`: `overheated = true` durante `OVERHEAT_LOCK = 1.6` s (el cañón parpadea en rojo); al terminar, `heat = 50`. La barra CALOR cambia de verde a amarillo desde 60 y a rojo desde 85.
- Racha: una bala propia que derriba un alien o el OVNI suma `streak + 1`. Una bala que sale por arriba sin impactar, o que impacta un escudo, es un **fallo**: `streak = 0`. Una bala que se anula contra una bala enemiga no suma ni corta. `multiplier = min(5, 1 + floor(streak / 5))`.
- Puntos: alien = base × `multiplier`; OVNI = base × `multiplier`. Un texto flotante muestra los puntos ganados en cada impacto.
- Morir (impacto enemigo) corta la racha (`streak = 0`) y enfría el cañón (`heat = 0`).
- Bonus de oleada: al limpiarla, `+100 × level` (sin multiplicador), mostrado en el texto "OLEADA N SUPERADA +X".
- Vida extra: `EXTRA_LIFE_EVERY = 5000` puntos, sin superar `MAX_LIVES = 5`.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma, solo recibe la entrada nueva `invasores`.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_invasores.sql` con el `delete` y el `insert` del modelo de datos de arriba. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que existe una sola fila `invasores` con `cover = 'cover-invasores'`.
2. En `app/globals.css`, borrar `.cover-invaders` y `.cover-invaders::after` (líneas ~782–800) y crear `.cover-invasores` (+ `::after`, y `::before` opcional) con `/frontend-design`, usando `--green`/`--cyan`/`--magenta`/`--yellow` y el patrón de capas `radial-gradient`/`linear-gradient` de las demás covers. Verificar con `grep -rn "cover-invaders" app components lib` que no quede ninguna referencia al nombre viejo.
3. Crear `components/games/invasores/engine.ts` con las constantes compartidas y la tabla `ALIEN_SPRITES` (dos frames de 11×8 por `AlienKind`, arrays de strings), los bitmaps del cañón y del OVNI, y las funciones privadas `spawnWave()`, `buildShields()`, `stepFormation()`, `updatePlayer(dt)`, `updateBullets(dt)`, `alienFire(dt)`, `updateUfo(dt)`, `hitShield(bullet)`, `checkCollisions()`, `killPlayer()`. En este paso el cañón dispara con `MAX_PLAYER_BULLETS`/`FIRE_COOLDOWN` y puntos base, sin calor ni racha: el juego ya es jugable.
4. En el mismo `engine.ts`, agregar `updateHeat(dt)` (calor, bloqueo, enfriamiento), `registerHit()`/`registerMiss()` (racha y multiplicador), el bonus de oleada y la vida extra por `EXTRA_LIFE_EVERY`. `draw()` agrega la barra CALOR (10×60 px a la izquierda del cañón, sigue su `x`), el `xN` junto al SCORE (parpadea al subir) y los textos flotantes de puntos. Sin `window`/`document`/canvas globales.
5. Crear `components/games/invasores/invasores-game.tsx`, siguiendo `components/games/arkanoid/arkanoid-game.tsx`: canvas `800×600`, loop de `requestAnimationFrame` pausable con `paused` (siempre llama `draw()`), listeners `keydown`/`keyup` para `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD` y `Space` (`preventDefault` en flechas y espacio), solo mientras está montado. `forwardRef` expone `restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressFire(held)`. Callbacks diffeados cada frame; `onGameOver` solo al pasar a `"gameover"`.
6. Crear `components/games/invasores/touch-controls.tsx`: `.touch-controls-move` con ◀ (`pressLeft`, mantener), `<div aria-hidden="true" />`, ▶ (`pressRight`, mantener); `.touch-btn-fire` ● "Disparar" (`pressFire`, mantener con `onPointerDown/Up/Leave/Cancel`). Detección táctil vía `useSyncExternalStore` sobre `matchMedia('(pointer: coarse)')`.
7. Agregar la entrada `invasores` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: InvasoresGame`, `TouchControls: InvasoresTouchControls`, sin `hudLivesLabel`), con el cast `as unknown as` de las demás entradas. No se toca `components/jugar/jugar-client.tsx`.
8. Agregar la sección "INVASORES" (y su fila en la tabla) a `references/implemented-games.md`, y quitar `invasores` de su lista de placeholders.
9. Recorrer manualmente con `npm run dev`: la tarjeta "INVASORES" aparece con `cover-invasores`; en `/juegos/invasores/jugar` mantener `Espacio` dispara en ráfaga hasta 3 balas, la barra CALOR sube y al 100% el cañón se bloquea 1,6 s; acertar 5 seguidos sube a x2 y fallar uno vuelve a x1; perder las vidas o dejar llegar la formación abre el modal "FIN DEL JUEGO"; "PAUSA"/"REANUDAR"/"FIN"/"JUGAR DE NUEVO" funcionan; guardar persiste en `av_scores`; con emulación táctil aparecen los 3 botones. Confirmar que los demás juegos siguen iguales y que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` tiene exactamente una fila `id: "invasores"` con `title: "INVASORES"`, `cat: "SHOOTER"` y `cover: "cover-invasores"`.
- [ ] La tarjeta "INVASORES" aparece en `/` y `/biblioteca` con su cover nuevo (`cover-invasores`), sin clase CSS faltante, y `cover-invaders` ya no existe en `app/globals.css`.
- [ ] `/juegos/invasores` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `invasores`.
- [ ] En `/juegos/invasores/jugar`, `←`/`A` y `→`/`D` mueven el cañón y mantener `Espacio` dispara en ráfaga, con como máximo 3 balas propias en pantalla y al menos 0,18 s entre disparos.
- [ ] Cada disparo sube la barra CALOR; al llegar al 100% el cañón no dispara durante 1,6 s, parpadea en rojo y luego queda en 50%.
- [ ] Sin disparar, la barra CALOR baja sola hasta 0.
- [ ] Derribar un alien suma su valor base (10/20/30) multiplicado por el multiplicador vigente; el puntaje sube por el motor, no por temporizador.
- [ ] Cada 5 aciertos consecutivos el multiplicador sube en 1 hasta x5, visible junto al SCORE in-canvas.
- [ ] Una bala que sale por arriba sin impactar, o que impacta un escudo, devuelve el multiplicador a x1; una bala anulada contra una bala enemiga no lo cambia.
- [ ] Morir devuelve el multiplicador a x1 y el calor a 0.
- [ ] El OVNI cruza la franja superior cada 20–30 s y derribarlo suma 50/100/150/300 × multiplicador y cuenta como acierto.
- [ ] La formación avanza por pasos, baja 16px al tocar un borde y marcha más rápido cuantos menos alienígenas quedan.
- [ ] Las balas desgastan los escudos por celdas, y los escudos se regeneran en cada oleada.
- [ ] Limpiar una oleada suma `100 × nivel` y muestra "OLEADA N SUPERADA +X"; la siguiente empieza sola y el nivel del HUD sube en 1.
- [ ] Cada 5000 puntos se gana una vida extra, sin superar 5 vidas.
- [ ] El HUD del reproductor (`.player-hud`: puntaje, corazones de "Vidas", "Nivel") y el HUD in-canvas (SCORE/OLEADA/VIDAS) muestran siempre los mismos valores, sin desincronizarse.
- [ ] Perder la última vida, o que un alien alcance la línea de invasión (`y = 520`), abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final; la animación de muerte y la transición de oleada no lo abren.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, el calor no se enfría durante la pausa) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (oleada 1, 3 vidas, puntaje 0, calor 0, x1), no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "invasores", score, name }`), visible recargando `/juegos/invasores` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero aparecen ◀/▶ y FUEGO, se pueden mantener a la vez y controlan el juego; con mouse/teclado normal no aparecen.
- [ ] Salir de `/juegos/invasores/jugar` no deja listeners de teclado activos en `window`.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual, y `gloton`/`ranaria`/`duelo-pixel` siguen con la simulación falsa.
- [ ] `references/implemented-games.md` incluye INVASORES.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego diseñado desde cero (no hay material en `references/`), retomando la sugerencia `invasores` del `game-planner`. Elección del juego hecha por el usuario.
- **Sí:** se conserva el `id` `invasores` con `delete` + `insert` — es el slug que fijó el `game-planner`, no choca con nada y mantiene la URL `/juegos/invasores`.
- **No:** `update` de la fila existente — el `delete` en cascada limpia de `av_scores` los puntajes de la simulación falsa.
- **Sí:** se heredan `color: green`, `best: 54190` y `plays: "18.0K"` del placeholder; `short`/`long` se reescriben para contar el twist.
- **Sí:** cover nuevo `.cover-invasores` diseñado con `/frontend-design` que muestra la ráfaga y el cañón al rojo — el arte actual de `.cover-invaders` no comunica la mecánica que distingue a esta variante.
- **Sí:** fuego en ráfaga (3 balas, cooldown 0,18 s) limitado por calor en vez de una sola bala — hace el juego más accesible en móvil y agrega una decisión (disparar o esperar) en cada segundo.
- **Sí:** multiplicador x1–x5 por racha de aciertos, cortado por cada fallo — castiga el spam que el fuego en ráfaga permite y premia la puntería, que es lo que debe separar a los jugadores en el leaderboard.
- **Sí:** impactar un escudo propio cuenta como fallo; anular una bala enemiga es neutro — disparar a través de los escudos no debe ser gratis, y defenderse de una bala no debe castigarse.
- **Sí:** calor y multiplicador solo in-canvas; "Vidas" del HUD sigue siendo las 3 vidas reales con corazones — el juego tiene vidas en el sentido de Asteroides, y `.player-hud` no tiene un slot libre para un cuarto dato.
- **Sí:** "Nivel" del HUD = número de oleada; oleadas infinitas, más bajas (hasta 4 escalones) y un 8% más rápidas cada vez, con bonus `100 × nivel`.
- **Sí:** vida extra cada 5000 puntos (máx. 5) en vez de una sola a los 1500 — con el multiplicador los puntajes crecen más rápido que en el clásico.
- **No:** el truco del OVNI por conteo de disparos — con ráfagas es inmanejable y favorece conocimiento oculto.
- **Sí:** `dt` variable estándar; marcha y calor usan acumuladores sobre el `dt` real, como el tick de Snake (SPEC 09).
- **Sí:** teclado con flechas y `A`/`D` para mover y `Espacio` mantenido para disparar; táctil ◀/▶ (slots 1 y 3 de `.touch-controls-move`) + `.touch-btn-fire` de tipo "mantener", sin CSS nuevo.
- **No:** sonido, sprites externos, pantalla de inicio, pausa propia y récord local — la plataforma ya los cubre o ningún juego los tiene.
- **Sí:** se agrega la entrada al registry existente (`components/games/registry.ts`) en vez de crearlo.

## Risks

| Riesgo                                                                                                                                    | Mitigación                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Con 3 balas en ráfaga, la estrategia dominante podría ser mantener `Espacio` siempre y aceptar x1 — el multiplicador dejaría de importar. | El calor limita la ráfaga continua a ~1,5 s antes del bloqueo; se prueba en el paso 9 que un jugador que apunta supera claramente a uno que spamea en la oleada 3. Si no, se sube `HEAT_PER_SHOT` en el mismo spec. |
| Una bala que sale por arriba "fallando" mientras otra de la misma ráfaga acierta hace que la racha dependa del orden de resolución.       | Cada bala se resuelve por separado en `updateBullets(dt)` en orden de disparo; el texto flotante "x1" al fallar hace visible el corte.                                                                              |
| La bala propia recorre hasta 30px por frame con `dt = 0.05`, más que la altura de un alien (24px).                                        | Colisión con rectángulo barrido entre la `y` previa y la actual.                                                                                                                                                    |
| Con `STEP_MIN = 0.03` s el último alien puede dar varios pasos en un frame lento y saltarse el chequeo de borde.                          | Los pasos pendientes se ejecutan de a uno, con chequeo de borde en cada uno y un tope de 4 pasos por frame.                                                                                                         |
| El `delete` + `insert` del mismo `id` borra en cascada los puntajes de `av_scores` guardados desde la simulación falsa.                   | Es deseado (no son puntajes reales) y queda anotado en el comentario de la migración.                                                                                                                               |
| Mantener ◀/▶ y FUEGO a la vez en móvil requiere multitouch sobre dos botones.                                                             | Cada botón maneja sus propios eventos de puntero y `.touch-btn` ya tiene `touch-action: none`; se prueba con emulación táctil y, si es posible, en un dispositivo real.                                             |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo (`gloton`, `ranaria`, `duelo-pixel`).
- Tipos de alien especiales, jefes, power-ups y bomba.
- Mejoras permanentes del cañón entre oleadas.
- El truco del OVNI por conteo de disparos.
- Sonido o música.
- Sprites o imágenes externas.
- Pantalla de inicio propia, pausa propia y récord local.
- Controles táctiles por gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
