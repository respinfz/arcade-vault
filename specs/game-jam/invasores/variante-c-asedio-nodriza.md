# SPEC GJ — Juego: INVASORES (Variante C: Asedio de la nodriza)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-23
> **Objective:** Agregar INVASORES jugable al catálogo como Space Invaders ampliado (formaciones rotativas, aliens blindados y divisores, jefe nodriza cada 5 oleadas, power-ups del OVNI, bomba y un "Blindaje" planetario en lugar de vidas), reemplazando la simulación falsa del placeholder `invasores` por un motor real diseñado desde cero, con HUD sincronizado, controles táctiles ◀/▶ + FUEGO + BOMBA y leaderboard en `av_scores`.

## Por qué existe este spec

Este spec sale de la game jam de Arcade Vault para el juego **INVASORES** (estilo Space Invaders), sin tema impuesto: la ambientación es la estética neón/CRT de la plataforma. Retoma la sugerencia `invasores` del agente `game-planner` (`references/game-suggestions-to-do.md`, 32/35, esfuerzo M, estado "recomendado": "puntaje por alien + OVNI, oleadas infinitas; táctil ◀/▶ + FUEGO reutiliza el layout de Asteroides; sin assets, dibujo procedural").

La tarjeta `invasores` ya existe en `av_games` ("INVASORES — Defiende el planeta de filas alienígenas", `SHOOTER`, cover `cover-invaders`, color `green`) pero hoy corre la simulación falsa de puntaje del reproductor. Este spec la reemplaza por el juego real, con el patrón de SPEC 05 (motor/componente/táctil) y SPEC 06 (catálogo/leaderboard). El `id` nuevo coincide con el del placeholder (`invasores`), así que la migración hace `delete` + `insert` del mismo `id`.

No hay material en `references/started-games/` ni en `references/source-assets/` para este juego: el motor se diseña desde cero y todo se dibuja en código.

**Esta variante (C) es la ambiciosa:** toma el Space Invaders clásico y le suma los sistemas de su secuela directa (Space Invaders Part II, 1979: aliens que se parten y nave nodriza) más power-ups. Las oleadas rotan entre tres formaciones, aparecen aliens blindados (2 impactos) y divisores (se parten en dos minis que bajan en zigzag), y cada 5 oleadas llega una nave nodriza con barra de vida. El OVNI suelta cápsulas (disparo doble, blindaje, bomba). En vez de vidas, el jugador defiende un **Blindaje** planetario de 0 a 5: lo bajan los impactos al cañón y los aliens que llegan al suelo. La formación que toca la línea de invasión no mata al instante: golpea el Blindaje y retrocede. Mantiene el multiplicador por racha de la variante B, sin el calor. La variante A es el clásico mínimo y la B el clásico con ráfaga y racha. Las tres comparten el `game-id` `invasores`, así que son **mutuamente excluyentes**: se implementa solo una.

Para no confundir términos, en esta variante los escudos destructibles del suelo se llaman **barreras** y "Blindaje" es exclusivamente el contador del HUD.

## Scope

**In:**

- Reemplazar la fila `invasores` de `av_games` por una fila nueva con el mismo `id` (vía migración SQL: `delete` + `insert`), con `title: "INVASORES"`, categoría `SHOOTER`, cover `cover-invasores`, y los valores decorativos del placeholder (`color: green`, `best: 54190`, `plays: "18.0K"`). `short`/`long` nuevos, que describen nodriza, power-ups y blindaje.
- Reemplazar la clase `.cover-invaders` de `app/globals.css` por una clase nueva `.cover-invasores` (silueta de una nave nodriza magenta sobre una formación verde/cyan, con una cápsula de power-up cayendo), diseñada con `/frontend-design`.
- Motor del juego en `components/games/invasores/engine.ts`, diseñado desde cero, sin variables globales de `window`/`document`/canvas: cañón, formación con marcha acelerada, tres patrones de formación rotativos, cinco tipos de alien (`pulpo`, `cangrejo`, `calamar`, `blindado`, `divisor`) más los `mini` que suelta el divisor, barreras destructibles, OVNI con cápsulas de power-up, jefe nodriza cada 5 oleadas, bomba, racha con multiplicador x1–x5, Blindaje planetario y oleadas infinitas.
- Canvas lógico 800×600 (4:3), con fondo negro, estrellas estáticas tenues y una línea de suelo verde neón que parpadea en rojo al recibir un asalto.
- HUD in-canvas en una franja superior de 40px (SCORE + `xN` a la izquierda, OLEADA al centro, BLINDAJE en pips y BOMBAS en íconos a la derecha), más barra de vida de la nodriza bajo la franja durante las oleadas de jefe y barra de tiempo del disparo doble junto al cañón. Sincronizado con `.player-hud`.
- Componente `components/games/invasores/invasores-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressFire(held)`, `pressBomb()`) y props de callback `onScoreChange`/`onLivesChange` (recibe `engine.armor`)/`onLevelChange`/`onGameOver`.
- Controles táctiles `components/games/invasores/touch-controls.tsx`: ◀/▶ ("mantener presionado") en los slots 1 y 3 de `.touch-controls-move` (relleno `<div aria-hidden>` en el slot 2), `.touch-btn-fire` ("FUEGO", mantener presionado) y `.touch-btn-drop` reutilizado tal cual como botón "BOMBA" (tap). Visibles solo con `matchMedia('(pointer: coarse)')`. No se agrega CSS de controles nuevo.
- Agregar la entrada `invasores` al registry existente `components/games/registry.ts` con `hudLivesLabel: "Blindaje"` (valor numérico plano, sin corazones).
- Pausa real (congela `update(dt)`, conserva el último frame, incluidos los temporizadores del disparo doble y del jefe) y game over real (Blindaje en 0) conectado al modal "FIN DEL JUEGO" existente.
- Agregar la sección de INVASORES a `references/implemented-games.md`.

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo (`gloton`, `ranaria`, `duelo-pixel`) siguen con la simulación falsa; `asteroides`, `tetris`, `arkanoid` y `snake` no cambian.
- Sobrecalentamiento del cañón (variante B).
- Aliens que bajan en picada hacia el jugador saliendo de la formación (estilo Galaxian) — cambiaría el juego; solo los `mini` abandonan la formación, y bajan en zigzag sin perseguir.
- Más tipos de jefe, fases de jefe o tienda de mejoras entre oleadas.
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
  ('invasores', 'INVASORES', 'Resiste el asedio alienígena y derriba a la nodriza.', 'Oleadas de invasores de neón cambian de formación y bajan sin pausa: algunos resisten dos impactos, otros se parten en dos al caer. Cada cinco oleadas, una nave nodriza toma el cielo. Derriba el OVNI para atrapar disparo doble, blindaje o bombas, encadena aciertos hasta x5 y no dejes que el blindaje del planeta llegue a cero.', 'SHOOTER', 'cover-invasores', 'green', 54190, '18.0K');
```

`color`/`best`/`plays` reutilizan los valores del placeholder. El `delete` borra en cascada (`on delete cascade`) las filas de `av_scores` con `game_id = 'invasores'` que haya dejado la simulación falsa.

```ts
// components/games/invasores/engine.ts
export interface EngineInput {
  keys: Record<string, boolean>; // ArrowLeft/KeyA, ArrowRight/KeyD, Space (mantener)
  justPressed: Record<string, boolean>; // KeyX o ArrowUp: bomba (tap)
}
export type GameState = "playing" | "dying" | "waveClear" | "gameover";
export type AlienKind =
  "pulpo" | "cangrejo" | "calamar" | "blindado" | "divisor";
export type FormationName = "bloque" | "cuna" | "damero";
export type PowerUpKind = "doble" | "blindaje" | "bomba";

export class InvasoresEngine {
  score = 0;
  armor = 3; // 0..5, ocupa "Vidas" en .player-hud con hudLivesLabel "Blindaje" (número plano)
  level = 1; // número de oleada, "Nivel" en .player-hud
  state: GameState = "playing";
  bombs = 1; // 0..3, solo in-canvas
  streak = 0; // aciertos consecutivos, solo in-canvas
  multiplier = 1; // 1..5, solo in-canvas junto al SCORE
  doubleShotTime = 0; // segundos restantes de disparo doble, solo in-canvas

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // oleada 1, blindaje 3, 1 bomba, puntaje 0, x1
  forceGameOver(): void {} // state = "gameover", conserva score
  update(dt: number): void {} // dt en segundos, clampeado a 0.05
  draw(): void {} // fondo + barreras + formación + minis + nodriza + OVNI + cápsulas + balas + cañón + HUD in-canvas
}
```

Base clásica (canvas lógico 800×600, velocidades en px/s):

- Formación: grilla de `5×11` celdas de `48×40`, alien de `33×24` (bitmap 11×8 a escala 3), origen `x = 136`, `y = 100 + 20 × min(level − 1, 4)`. Marcha con paso `STEP_X = 8`, intervalo `lerp(0.03, 0.55, vivos / total) / (1 + 0.08 × (level − 1))`, baja `STEP_Y = 16` e invierte al tocar `[16, 784]`.
- Cañón: `44×20` en `y = 540`, `PLAYER_SPEED = 300`, `x` en `[30, 770]`.
- Fuego: `MAX_PLAYER_BULLETS = 2`, `FIRE_COOLDOWN = 0.25` s, `PLAYER_BULLET_SPEED = 600`. Con disparo doble activo, cada disparo crea 2 balas paralelas (`x ± 10`) y el máximo sube a 4.
- Balas enemigas: `min(240 + 15 × (level − 1), 400)` px/s, máximo `min(3 + floor(level / 2), 6)`, temporizador de 0.5–1.2 s escalado por `max(0.5, 1 − 0.05 × (level − 1))`. Bala propia contra bala enemiga destruye ambas.
- Barreras: 4, en `x = 160, 320, 480, 640`, borde superior `y = 440`, grilla de `11×8` celdas de `6px` en arco; cada impacto borra la celda y hasta 2 vecinas; se regeneran cada oleada.
- OVNI: cada 20–30 s si quedan ≥ 8 aliens y la oleada no es de jefe; cruza `y = 60` a `120` px/s; valor base al azar de `[50, 100, 150, 300]`.
- `DYING_TIME = 1.2` s, `WAVE_CLEAR_TIME = 1.5` s, ambos avanzan solos.

Sistemas propios de esta variante:

- **Formaciones:** `FORMATIONS: Record<FormationName, boolean[][]>` (máscaras de 5×11). `bloque` = llena (55 aliens). `cuna` = V invertida: la fila 0 tiene las 3 columnas centrales y cada fila siguiente suma 1 columna por lado (3, 5, 7, 9, 11 = 35 aliens). `damero` = celdas con `(fila + columna) % 2 === 0` (28 aliens). Se elige por `["bloque", "cuna", "damero"][(level − 1) % 3]`.
- **Tipos por fila:** fila 0 `calamar` (30, magenta), filas 1–2 `cangrejo` (20, cyan), filas 3–4 `pulpo` (10, verde). Desde la oleada 2, la fila 1 pasa a `blindado` (40 puntos, 2 impactos, amarillo; al primer impacto se vuelve naranja y no suma puntos). Desde la oleada 3, la fila 3 pasa a `divisor` (25 puntos, cyan con núcleo magenta).
- **Minis:** al derribar un `divisor` aparecen 2 `mini` (`18×12`) en su posición, que abandonan la formación y bajan en zigzag (`MINI_SPEED_Y = 70 + 5 × (level − 1)`, oscilación horizontal de ±40px con período 1,2 s). Derribar un mini vale 15. Un mini que llega a `y = 530` resta 1 de Blindaje y desaparece. La oleada no termina hasta que no quedan aliens ni minis.
- **Nodriza:** en las oleadas múltiplo de 5 (`level % 5 === 0`) la formación son solo 2 filas de `pulpo` de escolta (22 aliens, sin OVNI), y aparece la nodriza (`160×56`, magenta, `y = 90`, se desplaza a `80` px/s rebotando en `[40, 760]`). Vida `BOSS_HP = 30 + 15 × (bossIndex − 1)`, con `bossIndex = level / 5`. Dispara un abanico de 3 balas (−15°, 0°, +15°) cada `1.4` s, con su propio máximo de 9 balas en pantalla, aparte del de la formación. Cada impacto vale `5 × multiplier` y cuenta como acierto. Destruirla vale `1000 × bossIndex × multiplier`. Barra de vida de `400×6` px centrada en `y = 46`. La oleada termina cuando mueren la nodriza, la escolta y los minis.
- **Cápsulas:** derribar el OVNI suelta una cápsula (`20×20`, letra "D"/"B"/"X") que cae a `140` px/s. Probabilidades: `doble` 40%, `blindaje` 30%, `bomba` 30%. Se atrapa superponiéndola con el cañón. `doble` → `doubleShotTime = 10` (recarga, no acumula). `blindaje` → `armor + 1` hasta 5. `bomba` → `bombs + 1` hasta 3. Si toca el suelo, se pierde.
- **Bomba:** `KeyX` o `ArrowUp` (tap, `justPressed`), solo en `"playing"` y con `bombs > 0`. Efecto: elimina todas las balas enemigas, aplica 1 impacto a cada alien de la fila viva más baja de la formación y a todos los minis, y 3 impactos a la nodriza. Destello blanco de 0,3 s. Los puntos de la bomba se suman con multiplicador x1 y no suman ni cortan la racha.
- **Racha:** como la variante B. Acierto (alien, mini, OVNI, impacto a la nodriza) → `streak + 1`. Bala que sale por arriba sin impactar, o que impacta una barrera → fallo, `streak = 0`. Bala anulada contra bala enemiga → neutro. `multiplier = min(5, 1 + floor(streak / 5))`.
- **Blindaje:** empieza en 3, máximo 5. Impacto enemigo al cañón → `"dying"` 1,2 s, luego `armor − 1`, racha a 0 y `doubleShotTime = 0`. Mini en el suelo → `armor − 1`, sin `"dying"`. **Asalto:** si el borde inferior de un alien de la formación alcanza `INVASION_Y = 520`, `armor − 2`, la formación vuelve a la `y` de inicio de la oleada conservando sus aliens vivos, se eliminan las balas enemigas y la línea de suelo parpadea en rojo 1 s. Si `armor ≤ 0` → `"gameover"` (el HUD muestra 0).
- **Bonus y recompensas:** limpiar una oleada suma `100 × level` (sin multiplicador). Cada `ARMOR_BONUS_EVERY = 7500` puntos, `armor + 1` hasta 5.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma (`hudLivesLabel` ya existe desde SPEC 07), solo recibe la entrada nueva `invasores`.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_invasores.sql` con el `delete` y el `insert` del modelo de datos de arriba. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que existe una sola fila `invasores` con `cover = 'cover-invasores'`.
2. En `app/globals.css`, borrar `.cover-invaders` y `.cover-invaders::after` (líneas ~782–800) y crear `.cover-invasores` (+ `::after`, y `::before` opcional) con `/frontend-design`, usando `--green`/`--cyan`/`--magenta`/`--yellow` y el patrón de capas de gradientes de las demás covers. Verificar con `grep -rn "cover-invaders" app components lib` que no quede ninguna referencia.
3. Crear `components/games/invasores/engine.ts` con la base clásica: constantes, `ALIEN_SPRITES` (dos frames de 11×8 por `AlienKind`, arrays de strings), bitmaps del cañón y del OVNI, y las funciones privadas `spawnWave()`, `buildBarriers()`, `stepFormation()`, `updatePlayer(dt)`, `updateBullets(dt)`, `alienFire(dt)`, `updateUfo(dt)`, `hitBarrier(bullet)`, `checkCollisions()`, `killPlayer()`. Incluye el Blindaje con impactos al cañón y el asalto. En este paso el juego ya es jugable con la formación `bloque` y los tres tipos básicos.
4. Agregar a `engine.ts` la racha y el multiplicador (`registerHit()`/`registerMiss()`), `FORMATIONS` con la rotación por oleada, los tipos `blindado` y `divisor`, y los `mini` con `updateMinis(dt)`.
5. Agregar a `engine.ts` la nodriza: `spawnBoss()`, `updateBoss(dt)` (movimiento y abanico), daño, barra de vida y fin de oleada de jefe.
6. Agregar a `engine.ts` las cápsulas (`dropCapsule()`, `updateCapsules(dt)`), el disparo doble, la bomba (`useBomb()`), el bonus de oleada y el `+1` de Blindaje por `ARMOR_BONUS_EVERY`. `draw()` completa el HUD in-canvas (SCORE `xN`, OLEADA, pips de BLINDAJE, íconos de BOMBAS, barra de disparo doble, barra de la nodriza, destello de bomba, parpadeo rojo del asalto, textos flotantes de puntos). Sin `window`/`document`/canvas globales.
7. Crear `components/games/invasores/invasores-game.tsx`, siguiendo `components/games/arkanoid/arkanoid-game.tsx`: canvas `800×600`, loop de `requestAnimationFrame` pausable con `paused` (siempre llama `draw()`), listeners `keydown`/`keyup` para `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD`, `Space`, `KeyX` y `ArrowUp` (`preventDefault` en flechas y espacio), solo mientras está montado. `forwardRef` expone `restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressFire(held)`, `pressBomb()` (escribe `justPressed["KeyX"] = true`). `onLivesChange` recibe `engine.armor`; `onGameOver` solo al pasar a `"gameover"`.
8. Crear `components/games/invasores/touch-controls.tsx`: `.touch-controls-move` con ◀ (`pressLeft`, mantener), `<div aria-hidden="true" />`, ▶ (`pressRight`, mantener); `.touch-btn-fire` ● "Disparar" (`pressFire`, mantener); `.touch-btn-drop` "✹ BOMBA" con `aria-label="Lanzar bomba"` (`pressBomb`, tap con `onPointerDown`). Detección táctil vía `useSyncExternalStore` sobre `matchMedia('(pointer: coarse)')`.
9. Agregar la entrada `invasores` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: InvasoresGame`, `TouchControls: InvasoresTouchControls`, `hudLivesLabel: "Blindaje"`), con el cast `as unknown as` de las demás entradas. No se toca `components/jugar/jugar-client.tsx`, que ya muestra el número plano cuando el rótulo no es `"Vidas"`.
10. Agregar la sección "INVASORES" (y su fila en la tabla) a `references/implemented-games.md`, con la nota "HUD: muestra **Blindaje** en lugar de Vidas", y quitar `invasores` de su lista de placeholders.
11. Recorrer manualmente con `npm run dev` todo el flujo de los criterios de aceptación. Para probar la nodriza sin jugar 5 oleadas, usar temporalmente una constante `DEBUG_START_LEVEL` en `engine.ts` y devolverla a `1` antes de terminar. Confirmar que los demás juegos siguen iguales y que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` tiene exactamente una fila `id: "invasores"` con `title: "INVASORES"`, `cat: "SHOOTER"` y `cover: "cover-invasores"`.
- [ ] La tarjeta "INVASORES" aparece en `/` y `/biblioteca` con su cover nuevo (`cover-invasores`), sin clase CSS faltante, y `cover-invaders` ya no existe en `app/globals.css`.
- [ ] `/juegos/invasores` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `invasores`.
- [ ] En `/juegos/invasores/jugar`, `←`/`A` y `→`/`D` mueven el cañón, mantener `Espacio` dispara (máximo 2 balas, 4 con disparo doble) y `X`/`↑` lanza una bomba si quedan.
- [ ] Derribar un alien suma su valor base (pulpo 10, cangrejo 20, calamar 30, blindado 40, divisor 25, mini 15) multiplicado por el multiplicador vigente; el puntaje sube por el motor, no por temporizador.
- [ ] Las oleadas 1, 2 y 3 usan las formaciones `bloque`, `cuna` y `damero`, y el ciclo se repite.
- [ ] Desde la oleada 2 hay aliens blindados que necesitan 2 impactos y cambian de color con el primero.
- [ ] Desde la oleada 3, derribar un divisor genera 2 minis que bajan en zigzag; un mini que llega al suelo resta 1 de Blindaje.
- [ ] En la oleada 5 (y cada 5 oleadas) aparece la nodriza con barra de vida, dispara en abanico y derribarla suma `1000 × número de jefe × multiplicador`; no aparece el OVNI en esas oleadas.
- [ ] Cada 5 aciertos consecutivos el multiplicador sube en 1 hasta x5; una bala que sale por arriba sin impactar o que impacta una barrera lo devuelve a x1.
- [ ] Derribar el OVNI suelta una cápsula; atraparla con el cañón activa disparo doble (10 s), suma 1 de Blindaje (máx. 5) o suma 1 bomba (máx. 3).
- [ ] La bomba elimina todas las balas enemigas, daña la fila más baja de la formación, todos los minis y la nodriza, y no cambia la racha.
- [ ] Un impacto enemigo al cañón resta 1 de Blindaje tras la animación de explosión y devuelve el multiplicador a x1.
- [ ] Cuando la formación alcanza la línea de invasión (`y = 520`), el Blindaje baja 2, la formación vuelve a su altura de inicio con los mismos aliens vivos y la línea de suelo parpadea en rojo.
- [ ] Limpiar una oleada suma `100 × nivel`, muestra "OLEADA N SUPERADA +X" y la siguiente empieza sola; el nivel del HUD sube en 1.
- [ ] El HUD del reproductor (`.player-hud`) muestra la columna "Blindaje" (no "Vidas") como número plano, con el mismo valor que los pips de BLINDAJE in-canvas; puntaje y nivel también coinciden, sin desincronizarse.
- [ ] Cuando el Blindaje llega a 0 se abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final; la animación de muerte, el asalto y la transición de oleada no lo abren si queda Blindaje.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, el disparo doble y el abanico de la nodriza no avanzan) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (oleada 1, Blindaje 3, 1 bomba, puntaje 0, x1), no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "invasores", score, name }`), visible recargando `/juegos/invasores` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero aparecen ◀/▶, FUEGO y BOMBA; ◀/▶ y FUEGO se pueden mantener a la vez y BOMBA lanza una bomba por toque; con mouse/teclado normal no aparecen.
- [ ] Salir de `/juegos/invasores/jugar` no deja listeners de teclado activos en `window`.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual, y `gloton`/`ranaria`/`duelo-pixel` siguen con la simulación falsa.
- [ ] Una partida nueva siempre arranca en la oleada 1 (`DEBUG_START_LEVEL` no existe o vale `1`).
- [ ] `references/implemented-games.md` incluye INVASORES.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego diseñado desde cero (no hay material en `references/`), retomando la sugerencia `invasores` del `game-planner`. Elección del juego hecha por el usuario.
- **Sí:** se conserva el `id` `invasores` con `delete` + `insert` — es el slug que fijó el `game-planner`, no choca con nada y mantiene la URL `/juegos/invasores`. Decidido por el agente game-jam — revisar.
- **No:** `update` de la fila existente — el `delete` en cascada limpia de `av_scores` los puntajes de la simulación falsa. Decidido por el agente game-jam — revisar.
- **Sí:** se heredan `color: green`, `best: 54190` y `plays: "18.0K"` del placeholder; `short`/`long` se reescriben. Decidido por el agente game-jam — revisar.
- **Sí:** cover nuevo `.cover-invasores` con la nodriza, diseñado con `/frontend-design` — el arte actual no comunica el jefe ni los power-ups. Decidido por el agente game-jam — revisar.
- **Sí:** ampliar con sistemas de Space Invaders Part II (aliens que se parten, nave nodriza) en vez de mecánicas de otros shooters — el juego sigue siendo reconocible como Space Invaders. Decidido por el agente game-jam — revisar.
- **No:** aliens en picada estilo Galaxian — lo convertiría en otro juego y se solaparía con ESCUADRÓN ESTELAR, sugerido aparte por el `game-planner`. Decidido por el agente game-jam — revisar.
- **Sí:** "Blindaje" planetario 0–5 en vez de vidas, mostrado con `hudLivesLabel: "Blindaje"` — el recurso lo bajan tanto los impactos al cañón como los aliens que tocan el suelo, así que "Vidas" sería engañoso. `jugar-client.tsx` ya muestra número plano para rótulos distintos de "Vidas" (SPEC 07). Decidido por el agente game-jam — revisar.
- **Sí:** el asalto a la línea de invasión cuesta 2 de Blindaje y hace retroceder la formación en vez de terminar la partida — con formaciones y minis más agresivos, la muerte instantánea del clásico sería frustrante. Decidido por el agente game-jam — revisar.
- **Sí:** los escudos del suelo se llaman "barreras" en esta variante — evita la confusión con el Blindaje del HUD. Decidido por el agente game-jam — revisar.
- **Sí:** racha con multiplicador x1–x5 igual que la variante B, pero sin sobrecalentamiento — la bomba y las cápsulas ya agregan decisiones; sumar calor saturaría el HUD in-canvas. Decidido por el agente game-jam — revisar.
- **Sí:** la bomba suma puntos a x1 y no afecta la racha — evita que sea una forma de subir el multiplicador sin apuntar. Decidido por el agente game-jam — revisar.
- **Sí:** la nodriza solo en oleadas múltiplo de 5, con vida creciente y sin OVNI en esas oleadas — ritma la partida y da hitos claros para el leaderboard. Decidido por el agente game-jam — revisar.
- **Sí:** "Nivel" del HUD = número de oleada. Decidido por el agente game-jam — revisar.
- **Sí:** teclado con flechas y `A`/`D` para mover, `Espacio` mantenido para disparar y `X`/`↑` para la bomba. Decidido por el agente game-jam — revisar.
- **Sí:** táctil ◀/▶ (slots 1 y 3 de `.touch-controls-move`) + `.touch-btn-fire` (mantener) + `.touch-btn-drop` reutilizado como BOMBA (tap) — mismo par de botones de acción que Tetris, sin CSS nuevo. Decidido por el agente game-jam — revisar.
- **Sí:** `DEBUG_START_LEVEL` temporal para probar la nodriza, devuelto a `1` antes de terminar — llegar a la oleada 5 a mano en cada prueba haría el recorrido manual impracticable. Decidido por el agente game-jam — revisar.
- **No:** sonido, sprites externos, pantalla de inicio, pausa propia y récord local. Decidido por el agente game-jam — revisar.
- **Sí:** se agrega la entrada al registry existente (`components/games/registry.ts`) en vez de crearlo.

## Risks

| Riesgo                                                                                                                                                                               | Mitigación                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Es el motor con más estado de la plataforma (formación, minis, nodriza, cápsulas, bomba, racha, blindaje): mayor superficie de bugs y un `engine.ts` que puede pasar de 1000 líneas. | El plan separa los sistemas en los pasos 3–6, cada uno jugable. Si `engine.ts` crece demasiado, los bitmaps y las máscaras de formación pueden ir en `components/games/invasores/sprites.ts`, sin cambiar el contrato del motor. |
| El asalto con retroceso puede hacer que una formación "rebote" varias veces seguidas contra la línea y drene el Blindaje de golpe.                                                   | Tras un asalto, la formación vuelve a la altura de inicio de la oleada (no solo unos píxeles arriba), así que tarda varios cruces en volver a bajar; se prueba en el paso 11.                                                    |
| El balance entre Blindaje, cápsulas de blindaje y el `+1` cada 7500 puntos puede volver la partida casi infinita para un jugador experto.                                            | El Blindaje está topado en 5 y las balas enemigas se aceleran por oleada hasta 400 px/s; se ajusta `ARMOR_BONUS_EVERY` si en la prueba la oleada 10 se supera sin riesgo.                                                        |
| El HUD in-canvas lleva seis datos (SCORE, xN, OLEADA, BLINDAJE, BOMBAS, barra de disparo doble) y puede verse apretado al escalar el canvas en móviles.                              | Franja de 40px con tipografía `Press Start 2P` a 14px como mínimo lógico; se verifica con emulación móvil en el paso 11.                                                                                                         |
| El abanico de la nodriza puede saturar la pantalla en jefes altos.                                                                                                                   | Las balas del abanico tienen su propio máximo de 9 en pantalla; si se alcanza, la nodriza salta ese disparo.                                                                                                                     |
| La bala propia recorre hasta 30px por frame con `dt = 0.05`, más que la altura de un mini (12px).                                                                                    | Colisión con rectángulo barrido entre la `y` previa y la actual de la bala.                                                                                                                                                      |
| El `delete` + `insert` del mismo `id` borra en cascada los puntajes de `av_scores` guardados desde la simulación falsa.                                                              | Es deseado (no son puntajes reales) y queda anotado en el comentario de la migración.                                                                                                                                            |
| Dos botones de acción cercanos a la derecha (FUEGO mantenido y BOMBA) pueden provocar bombas accidentales.                                                                           | Se reutiliza la separación ya probada en Tetris entre `.touch-btn-fire` y `.touch-btn-drop`; BOMBA es tap y solo actúa con `bombs > 0`.                                                                                          |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo (`gloton`, `ranaria`, `duelo-pixel`).
- Sobrecalentamiento del cañón.
- Aliens en picada estilo Galaxian.
- Más tipos de jefe, fases de jefe o tienda de mejoras.
- El truco del OVNI por conteo de disparos.
- Sonido o música.
- Sprites o imágenes externas.
- Pantalla de inicio propia, pausa propia y récord local.
- Controles táctiles por gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
