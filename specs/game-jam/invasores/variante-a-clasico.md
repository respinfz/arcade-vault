# SPEC GJ — Juego: INVASORES (Variante A: Clásico)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-23
> **Objective:** Agregar INVASORES jugable al catálogo como Space Invaders clásico (formación de 5×11 que marcha y desciende, escudos destructibles, OVNI y oleadas infinitas), reemplazando la simulación falsa del placeholder `invasores` por un motor real diseñado desde cero, con HUD sincronizado, controles táctiles ◀/▶ + FUEGO y leaderboard en `av_scores`.

## Por qué existe este spec

Este spec sale de la game jam de Arcade Vault para el juego **INVASORES** (estilo Space Invaders), sin tema impuesto: la ambientación es la estética neón/CRT de la plataforma. Retoma la sugerencia `invasores` del agente `game-planner` (`references/game-suggestions-to-do.md`, 32/35, esfuerzo M, estado "recomendado": "puntaje por alien + OVNI, oleadas infinitas; táctil ◀/▶ + FUEGO reutiliza el layout de Asteroides; sin assets, dibujo procedural").

La tarjeta `invasores` ya existe en `av_games` ("INVASORES — Defiende el planeta de filas alienígenas", `SHOOTER`, cover `cover-invaders`, color `green`) pero hoy corre la simulación falsa de puntaje del reproductor. Este spec la reemplaza por el juego real, con el patrón de SPEC 05 (motor/componente/táctil) y SPEC 06 (catálogo/leaderboard). A diferencia de SPEC 07/08/09, el `id` nuevo coincide con el del placeholder (`invasores`), así que la migración hace `delete` + `insert` del mismo `id`.

No hay ninguna carpeta en `references/started-games/` ni en `references/source-assets/` para este juego: el motor se diseña desde cero y los alienígenas se dibujan con bitmaps de píxeles definidos en código (`fillRect` por píxel), sin imágenes externas.

**Esta variante (A) es la fiel/mínima:** el Space Invaders de 1978 en su forma más barata que ya es divertida — una bala propia a la vez, tres tipos de alien (10/20/30 puntos), OVNI de valor aleatorio, escudos destructibles, 3 vidas y oleadas infinitas que empiezan cada vez más abajo. La variante B agrega fuego rápido con sobrecalentamiento y un multiplicador por racha de aciertos; la variante C agrega tipos de alien especiales, jefe nodriza, power-ups y bomba, con un "Escudo" planetario en vez de vidas. Las tres comparten el mismo `game-id` (`invasores`), así que son **mutuamente excluyentes**: se implementa solo una.

## Scope

**In:**

- Reemplazar la fila `invasores` de `av_games` por una fila nueva con el mismo `id` (vía migración SQL: `delete` + `insert`), con `title: "INVASORES"`, categoría `SHOOTER`, cover `cover-invasores`, y los valores decorativos que ya tenía el placeholder (`color: green`, `best: 54190`, `plays: "18.0K"`), sin inventar números nuevos. `short`/`long` se redactan de nuevo para describir el juego real.
- Renombrar la clase `.cover-invaders` de `app/globals.css` (y su `::after`) a `.cover-invasores`, sin cambiar sus reglas visuales — mismo criterio que SPEC 08 (`cover-bricks` → `cover-arkanoid`): el arte existente ya muestra filas de alienígenas y un cañón, así que no requiere `/frontend-design`.
- Motor del juego en `components/games/invasores/engine.ts`, diseñado desde cero, sin variables globales de `window`/`document`/canvas: cañón con movimiento horizontal, una bala propia a la vez, formación de 5×11 alienígenas que marcha por pasos y desciende al tocar un borde, aceleración de la marcha a medida que quedan menos alienígenas, disparos enemigos, 4 escudos destructibles por celdas, OVNI que cruza la franja superior, vidas, oleadas infinitas.
- Canvas lógico 800×600 (4:3, mismo tamaño que el resto de los juegos), con fondo negro, estrellas estáticas tenues y una línea de suelo verde neón.
- HUD in-canvas en una franja superior de 40px (SCORE a la izquierda, OLEADA al centro, VIDAS como cañones pequeños a la derecha), sincronizado con `.player-hud`.
- Componente `components/games/invasores/invasores-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressFire(held)`) y props de callback `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.
- Controles táctiles `components/games/invasores/touch-controls.tsx`: ◀/▶ ("mantener presionado") en los slots 1 y 3 de `.touch-controls-move` (con un `<div aria-hidden>` de relleno en el slot 2, igual que Arkanoid) y `.touch-btn-fire` ("FUEGO", mantener presionado). Visibles solo con `matchMedia('(pointer: coarse)')`. No se agrega CSS de controles nuevo.
- Agregar la entrada `invasores` al registry existente `components/games/registry.ts`, sin `hudLivesLabel` (usa el default `"Vidas"`, con corazones).
- Pausa real (congela `update(dt)`, conserva el último frame) y game over real (sin vidas, o la formación alcanza la línea de invasión) conectado al modal "FIN DEL JUEGO" existente.
- Agregar la sección de INVASORES a `references/implemented-games.md` (código, teclado, táctil, fin de partida), como pide `CLAUDE.md` al sumar un juego.

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo (`gloton`, `ranaria`, `duelo-pixel`) siguen con la simulación falsa, sin cambios; `asteroides`, `tetris`, `arkanoid` y `snake` no cambian.
- Fuego rápido, multiplicadores, power-ups, tipos de alien especiales y jefes (ver variantes B y C).
- El "truco" del OVNI del arcade original (valor según el número de disparos) — el valor es aleatorio.
- Sonido/música (la marcha de cuatro notas del original incluida) — ningún juego de la plataforma tiene audio todavía.
- Sprites o imágenes externas — todo se dibuja en código.
- Pantalla de inicio propia, pausa propia (P/Esc) y récord local en `localStorage` — la plataforma ya los cubre.
- Controles táctiles por gestos (arrastrar el cañón sobre el canvas).
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
-- Reemplaza el placeholder "invasores" (simulación falsa) por el juego real con el mismo id.
delete from av_games where id = 'invasores';

insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.', 'Cincuenta y cinco invasores de neón marchan en formación y bajan un escalón cada vez que tocan un borde. Mueve tu cañón, cúbrete tras los escudos y dispara antes de que toquen el suelo. Cuantos menos quedan, más rápido avanzan. Derriba el OVNI misterioso para un bonus y resiste oleada tras oleada.', 'SHOOTER', 'cover-invasores', 'green', 54190, '18.0K');
```

`color`/`best`/`plays` y el `short` reutilizan los valores que ya tenía el placeholder. El `delete` borra en cascada (`on delete cascade`) las filas de `av_scores` con `game_id = 'invasores'` que haya dejado la simulación falsa.

```ts
// components/games/invasores/engine.ts
export interface EngineInput {
  keys: Record<string, boolean>; // ArrowLeft/KeyA, ArrowRight/KeyD, Space (mantener)
  justPressed: Record<string, boolean>;
}
export type GameState = "playing" | "dying" | "waveClear" | "gameover";
export type AlienKind = "calamar" | "cangrejo" | "pulpo"; // 30 / 20 / 10 puntos

export class InvasoresEngine {
  score = 0;
  lives = 3; // "Vidas" en .player-hud (corazones); +1 una sola vez al cruzar EXTRA_LIFE_SCORE
  level = 1; // número de oleada, "Nivel" en .player-hud
  state: GameState = "playing";

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // oleada 1, 3 vidas, puntaje 0, escudos nuevos
  forceGameOver(): void {} // state = "gameover", conserva score
  update(dt: number): void {} // dt en segundos, clampeado a 0.05
  draw(): void {} // fondo + escudos + formación + OVNI + balas + cañón + HUD in-canvas
}
```

Constantes de juego (canvas lógico 800×600, velocidades en px/s):

- Formación: `ALIEN_COLS = 11`, `ALIEN_ROWS = 5`, celda de `48×40`, alien de `33×24` (bitmap de 11×8 píxeles a escala 3). Fila 0 = `calamar` (30 pts, magenta), filas 1–2 = `cangrejo` (20 pts, cyan), filas 3–4 = `pulpo` (10 pts, verde). Origen `x = 136` (centrado: `(800 − 11 × 48) / 2`), `y = 100 + WAVE_DROP × min(level − 1, 4)` con `WAVE_DROP = 20`.
- Marcha: cada paso mueve la formación `STEP_X = 8` px y alterna el frame de animación del bitmap. Intervalo entre pasos = `lerp(STEP_MIN, STEP_MAX, vivos / 55) / (1 + 0.08 × (level − 1))`, con `STEP_MAX = 0.55` s y `STEP_MIN = 0.03` s. Si un paso dejaría a un alien vivo fuera de `[16, 784]`, en su lugar la formación baja `STEP_Y = 16` px e invierte la dirección.
- Cañón: `44×20` en `y = 540`, velocidad `PLAYER_SPEED = 300`, `x` clampeado a `[30, 770]`.
- Bala propia: `4×14`, `PLAYER_BULLET_SPEED = 600`, máximo 1 en pantalla; mantener `Space` dispara en cuanto no hay bala propia viva.
- Balas enemigas: `ALIEN_BULLET_SPEED = min(240 + 15 × (level − 1), 400)`, máximo `min(3 + floor(level / 2), 6)` en pantalla. Un temporizador aleatorio de 0.5–1.2 s (multiplicado por `max(0.5, 1 − 0.05 × (level − 1))`) elige al alien más bajo de una columna viva: con probabilidad 1/3 la columna más cercana al cañón, si no una al azar. Una bala propia que choca con una bala enemiga destruye ambas.
- Escudos: 4, centrados en `x = 160, 320, 480, 640`, borde superior `y = 440`, grilla de `11×8` celdas de `6px` con forma de arco (esquinas superiores recortadas, hueco inferior central de 3×3). Cada impacto de bala (propia o enemiga) borra la celda tocada y hasta 2 celdas vecinas al azar. Un alien que se superpone con un escudo borra las celdas que toca. Los escudos se regeneran al empezar cada oleada.
- Línea de invasión: si el borde inferior de un alien vivo alcanza `INVASION_Y = 520`, la partida termina (`state = "gameover"`) sin importar las vidas restantes.
- OVNI: cada 20–30 s al azar, solo si quedan al menos 8 aliens vivos, cruza la franja `y = 60` desde un lado al azar a `UFO_SPEED = 120`. Tamaño `48×20`. Valor al derribarlo: uno al azar de `UFO_VALUES = [50, 100, 150, 300]`, mostrado como texto flotante durante 1 s.
- Muerte: un impacto enemigo pasa a `state = "dying"` durante `DYING_TIME = 1.2` s (explosión de píxeles del cañón, formación y OVNI congelados, balas enemigas eliminadas). Al terminar, `lives − 1`; si `lives === 0` → `"gameover"`, si no, el cañón reaparece en `x = 400` y vuelve a `"playing"`.
- Oleada limpia: al morir el último alien, `state = "waveClear"` durante `WAVE_CLEAR_TIME = 1.5` s con el texto in-canvas "OLEADA N SUPERADA"; luego `level + 1`, formación nueva, escudos nuevos, vuelve a `"playing"` sin pedir tecla.
- Vida extra: `EXTRA_LIFE_SCORE = 1500`, una sola vez por partida.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma (`GameHandle`/`GameRegistryEntry`), solo recibe la entrada nueva `invasores`.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_invasores.sql` con el `delete` y el `insert` del modelo de datos de arriba. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que existe una sola fila `invasores` con `cover = 'cover-invasores'`.
2. En `app/globals.css`, renombrar `.cover-invaders` y `.cover-invaders::after` (líneas ~782–800) a `.cover-invasores`, sin cambiar sus reglas. Verificar con `grep -n "cover-invaders" -r app components lib` que no quede ninguna referencia al nombre viejo.
3. Crear `components/games/invasores/engine.ts` con las constantes del modelo de datos, la tabla `ALIEN_SPRITES` (dos frames de 11×8 por `AlienKind`, como arrays de strings `"..X...X.."`), el bitmap del cañón y del OVNI, y las funciones privadas `spawnWave()`, `buildShields()`, `stepFormation()`, `updatePlayer(dt)`, `updateBullets(dt)`, `alienFire(dt)`, `updateUfo(dt)`, `hitShield(bullet)`, `checkCollisions()`, `killPlayer()`. `update(dt)` despacha por `state`. `draw()` pinta todo con `fillRect` y un `shadowBlur` moderado por color, más el HUD in-canvas de 40px. Sin `window`/`document`/canvas globales.
4. Crear `components/games/invasores/invasores-game.tsx`, siguiendo `components/games/arkanoid/arkanoid-game.tsx`: canvas `800×600`, loop de `requestAnimationFrame` pausable con la prop `paused` (siempre llama `draw()`), listeners `keydown`/`keyup` para `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD` y `Space` (con `preventDefault` en flechas y espacio), agregados y quitados solo mientras está montado. `forwardRef` expone `restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressFire(held)` (escriben en `inputRef.current.keys`). Los callbacks se diffean cada frame contra `score`/`lives`/`level`; `onGameOver` solo dispara cuando `state` pasa a `"gameover"` (nunca en `"dying"` ni `"waveClear"`).
5. Crear `components/games/invasores/touch-controls.tsx`: `.touch-controls-move` con ◀ (`pressLeft`, mantener), `<div aria-hidden="true" />` de relleno, ▶ (`pressRight`, mantener); `.touch-btn-fire` con ● "Disparar" (`pressFire`, mantener con `onPointerDown/Up/Leave/Cancel`). Detección táctil vía `useSyncExternalStore` sobre `matchMedia('(pointer: coarse)')`, igual que `components/games/asteroids/touch-controls.tsx`.
6. Agregar la entrada `invasores` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: InvasoresGame`, `TouchControls: InvasoresTouchControls`, sin `hudLivesLabel`), con el mismo cast `as unknown as` que las demás entradas. No se toca `components/jugar/jugar-client.tsx`.
7. Agregar la sección "INVASORES" (y su fila en la tabla) a `references/implemented-games.md`, y quitar `invasores` de la lista de placeholders de ese archivo.
8. Recorrer manualmente con `npm run dev`: la tarjeta "INVASORES" aparece en Biblioteca e Inicio con `cover-invasores`; en `/juegos/invasores/jugar` el cañón se mueve y dispara, cada alien suma su valor, la formación acelera y baja, los escudos se desgastan, el OVNI aparece y da bonus, perder las 3 vidas o dejar que la formación llegue a la línea de invasión abre el modal "FIN DEL JUEGO"; "PAUSA"/"REANUDAR"/"FIN"/"JUGAR DE NUEVO" funcionan; guardar la puntuación la persiste en `av_scores`; con emulación táctil aparecen los 3 botones. Confirmar que Asteroides/Tetris/Arkanoid/Snake siguen iguales y que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` tiene exactamente una fila `id: "invasores"` con `title: "INVASORES"`, `cat: "SHOOTER"` y `cover: "cover-invasores"`.
- [ ] La tarjeta "INVASORES" aparece en `/` y `/biblioteca` con su cover propio (`cover-invasores`), sin clase CSS faltante, y `cover-invaders` ya no existe en `app/globals.css`.
- [ ] `/juegos/invasores` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `invasores`.
- [ ] En `/juegos/invasores/jugar`, `←`/`A` y `→`/`D` mueven el cañón y `Espacio` dispara; nunca hay más de una bala propia en pantalla, y mantener `Espacio` vuelve a disparar en cuanto la anterior desaparece.
- [ ] Derribar un alien suma exactamente 10 (fila inferior), 20 (filas medias) o 30 (fila superior) puntos; el puntaje sube por el motor, no por temporizador.
- [ ] La formación avanza por pasos, baja 16px e invierte su dirección al tocar un borde, y marcha visiblemente más rápido cuantos menos alienígenas quedan.
- [ ] El OVNI cruza la franja superior cada 20–30 s y derribarlo suma 50, 100, 150 o 300 puntos, mostrados como texto flotante.
- [ ] Las balas (propias y enemigas) desgastan los escudos por celdas, y los escudos se regeneran al empezar cada oleada.
- [ ] Una bala propia que choca con una bala enemiga destruye ambas.
- [ ] Un impacto enemigo resta una vida tras la animación de explosión; al llegar a 1500 puntos se gana una vida extra una sola vez.
- [ ] Limpiar la oleada muestra "OLEADA N SUPERADA" y la siguiente empieza sola, más abajo (hasta 4 escalones) y más rápida; el nivel del HUD sube en 1.
- [ ] El HUD del reproductor (`.player-hud`: puntaje, corazones de "Vidas", "Nivel") y el HUD in-canvas (SCORE/OLEADA/VIDAS) muestran siempre los mismos valores, sin desincronizarse.
- [ ] Perder la última vida, o que un alien alcance la línea de invasión (`y = 520`), abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final; la animación de muerte y la transición de oleada no lo abren.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, conserva el último frame) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (oleada 1, 3 vidas, puntaje 0, escudos intactos), no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "invasores", score, name }`), visible recargando `/juegos/invasores` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero aparecen ◀/▶ y FUEGO, se pueden mantener a la vez (mover y disparar) y controlan el juego; con mouse/teclado normal no aparecen.
- [ ] Salir de `/juegos/invasores/jugar` no deja listeners de teclado activos en `window`.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual, y `gloton`/`ranaria`/`duelo-pixel` siguen con la simulación falsa.
- [ ] `references/implemented-games.md` incluye INVASORES.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego diseñado desde cero (no hay material en `references/started-games/` ni `references/source-assets/`), retomando la sugerencia `invasores` del `game-planner`. Elección del juego hecha por el usuario.
- **Sí:** se conserva el `id` `invasores` con `delete` + `insert` en vez de un `id` nuevo — el `game-planner` ya lo fijó como slug y el `id` del placeholder no choca con nada; mantener la URL `/juegos/invasores` evita romper enlaces. Decidido por el agente game-jam — revisar.
- **No:** `update` de la fila existente — el `delete` en cascada limpia de `av_scores` los puntajes que dejó la simulación falsa, que no deben competir con puntajes reales. Decidido por el agente game-jam — revisar.
- **Sí:** se heredan `color: green`, `best: 54190`, `plays: "18.0K"` y el `short` del placeholder; el `long` se reescribe. Mismo criterio que SPEC 08/09. Decidido por el agente game-jam — revisar.
- **Sí:** `.cover-invaders` se renombra a `.cover-invasores` sin rediseño — el arte ya representa el juego y el nombre nuevo sigue la convención `.cover-<id>`. Mismo criterio que SPEC 08. Decidido por el agente game-jam — revisar.
- **Sí:** una sola bala propia en pantalla, como el original — es la restricción que convierte el juego en uno de puntería y no de spam. Decidido por el agente game-jam — revisar.
- **Sí:** tabla de puntos clásica 10/20/30 y OVNI aleatorio entre 50/100/150/300. Decidido por el agente game-jam — revisar.
- **No:** el truco del OVNI por conteo de disparos — es conocimiento oculto que distorsiona el leaderboard a favor de quien lo conoce. Decidido por el agente game-jam — revisar.
- **Sí:** 3 vidas reales, "Vidas" estándar con corazones y una vida extra a los 1500 puntos — el juego tiene vidas en el sentido de Asteroides/Arkanoid, así que no hace falta `hudLivesLabel`. Decidido por el agente game-jam — revisar.
- **Sí:** "Nivel" del HUD = número de oleada; oleadas infinitas que empiezan hasta 4 escalones más abajo y marchan un 8% más rápido por oleada. Decidido por el agente game-jam — revisar.
- **Sí:** que la formación llegue a `y = 520` termina la partida al instante, como en el original. Decidido por el agente game-jam — revisar.
- **Sí:** los sub-estados `"dying"` y `"waveClear"` avanzan solos por tiempo, sin pedir tecla — a diferencia del "Nivel completado" de Arkanoid, mantienen el ritmo continuo del original. Decidido por el agente game-jam — revisar.
- **Sí:** `dt` variable estándar de la plataforma; la marcha usa un acumulador de tiempo contra el intervalo del paso, igual que el tick de Snake (SPEC 09). Decidido por el agente game-jam — revisar.
- **Sí:** teclado con flechas y `A`/`D` para mover y `Espacio` mantenido para disparar. Decidido por el agente game-jam — revisar.
- **Sí:** táctil con ◀/▶ en los slots 1 y 3 de `.touch-controls-move` (relleno en el slot 2, como Arkanoid) y `.touch-btn-fire` de tipo "mantener" — sin CSS nuevo; "mantener" evita tener que tocar en ráfaga con una sola bala permitida. Decidido por el agente game-jam — revisar.
- **No:** sonido, sprites externos, pantalla de inicio, pausa propia y récord local — la plataforma ya cubre lo que importa y ningún otro juego tiene audio. Decidido por el agente game-jam — revisar.
- **Sí:** se agrega la entrada al registry existente (`components/games/registry.ts`) en vez de crearlo.

## Risks

| Riesgo                                                                                                                             | Mitigación                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La bala propia recorre hasta 30px por frame con `dt = 0.05`, más que la altura de un alien (24px): puede atravesarlo sin colisión. | La colisión usa un rectángulo barrido entre la `y` previa y la actual de la bala, no solo su posición final.                                                                                              |
| Con `STEP_MIN = 0.03` s el último alien puede dar varios pasos en un solo frame lento y saltarse el chequeo de borde.              | El acumulador ejecuta los pasos pendientes de a uno dentro del mismo `update(dt)`, chequeando el borde en cada paso, con un tope de 4 pasos por frame.                                                    |
| El `delete` + `insert` del mismo `id` borra en cascada los puntajes de `av_scores` guardados desde la simulación falsa.            | Es deseado (no son puntajes reales). Se registra en el comentario de la migración y en las decisiones; `/spec-impl` puede contar las filas antes de aplicar si quiere dejarlo anotado.                    |
| Mantener ◀/▶ y FUEGO a la vez en móvil requiere multitouch sobre dos botones distintos.                                            | Cada botón maneja sus propios `pointerdown`/`pointerup` y `.touch-btn` ya tiene `touch-action: none`; se prueba en el paso 8 con emulación táctil y, si es posible, en un dispositivo real.               |
| 55 alienígenas + 352 celdas de escudo dibujados con `fillRect` por píxel y `shadowBlur` pueden bajar los FPS en móviles modestos.  | El bitmap de cada alien se pre-renderiza una vez por frame de animación en un `OffscreenCanvas`/canvas interno del motor y se dibuja con `drawImage`; `shadowBlur` solo en el cañón, el OVNI y las balas. |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo (`gloton`, `ranaria`, `duelo-pixel`).
- Fuego rápido, multiplicadores, power-ups, tipos de alien especiales y jefes.
- El truco del OVNI por conteo de disparos.
- Sonido o música.
- Sprites o imágenes externas.
- Pantalla de inicio propia, pausa propia y récord local.
- Controles táctiles por gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
