# SPEC GJ — Juego: FUGA NEÓN (Variante B: Drones y chips)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-23
> **Objective:** Agregar FUGA NEÓN jugable al catálogo como runner infinito de azoteas cyberpunk con salto y deslizamiento, drones de vigilancia, barreras láser, chips de datos con multiplicador y tres vidas, con motor real diseñado desde cero, HUD sincronizado, dos botones táctiles y leaderboard en `av_scores`.

## Por qué existe este spec

Este spec sale de la game jam de Arcade Vault con el tema **"Ciudad cyberpunk"**. El concepto elegido es un runner infinito: un mensajero huye por las azoteas de una megaciudad bajo la lluvia, perseguido por la red de vigilancia de la ciudad. Retoma la sugerencia `fuga-neon` del agente `game-planner` (`references/game-suggestions-to-do.md`, 31/35, "runner infinito, saltar/agacharse, 2 botones táctiles").

No hay ninguna carpeta en `references/started-games/` ni en `references/source-assets/` para este juego: el motor se diseña desde cero y todo se dibuja con figuras vectoriales.

**Esta variante (B) agrega el twist del tema sobre la base de la A:** a saltar se suma deslizarse (para pasar bajo drones de vigilancia y barreras láser a la altura de la cabeza), los chips de datos flotantes dan puntos extra con un multiplicador por racha, y el jugador tiene tres vidas con invulnerabilidad breve tras cada golpe. Los peligros nuevos se desbloquean por nivel, así que la dificultad crece por variedad y no solo por velocidad. La variante A es la versión mínima de un botón; la variante C agrega hackeo, distritos y torretas. Las tres comparten el mismo `game-id` (`fuga-neon`), así que son **mutuamente excluyentes**: se implementa solo una.

FUGA NEÓN **no reemplaza ningún placeholder**: ninguno de los cuatro que quedan (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) describe un runner. Es una fila nueva en `av_games`, sin `delete`.

## Scope

**In:**

- Entrada nueva `fuga-neon` en `av_games` (vía migración SQL), con `title: "FUGA NEÓN"`, categoría `ARCADE`, color `magenta`, cover `cover-fuga-neon`, y `best`/`plays` decorativos plausibles.
- Clase de cover art nueva `.cover-fuga-neon` en `app/globals.css` (skyline en silueta, lluvia diagonal, un dron con haz de luz y un corredor deslizándose), diseñada con `/frontend-design`.
- Motor del juego en `components/games/fuga-neon/engine.ts`, diseñado desde cero, sin variables globales de `window`/`document`/canvas: corredor en `x = 160` fijo, mundo que se desplaza hacia la izquierda, gravedad, salto de altura variable, deslizamiento sostenido, caída rápida en el aire, generador procedural de azoteas con garantía de alcanzabilidad.
- Tres tipos de peligro, desbloqueados por nivel: obstáculos bajos (`"ac"`, desde nivel 1), barreras láser a la altura de la cabeza (`"laser"`, desde nivel 2) y drones de vigilancia que flotan con oscilación vertical (`"dron"`, desde nivel 3).
- Chips de datos flotantes (`+25` × multiplicador), con multiplicador de racha `x1`..`x4` que se reinicia al recibir un golpe.
- Tres vidas: cada golpe (obstáculo, láser, dron o caída) resta una vida y da 1.5 s de invulnerabilidad; una caída reaparece al corredor sobre una plataforma de rescate.
- Canvas lógico 800×600 (4:3), con fondo de skyline en dos capas de parallax y lluvia procedural.
- HUD in-canvas con SCORE, NIVEL, VIDAS y el multiplicador de racha (`xN`) en una franja superior, sincronizado con `.player-hud`.
- Componente `components/games/fuga-neon/fuga-neon-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressJump(held)`, `pressSlide(held)`) y props de callback `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.
- Controles táctiles `components/games/fuga-neon/touch-controls.tsx`: `.touch-btn-fire` reutilizado para "Saltar" y `.touch-btn-drop` reutilizado para "Deslizar" (ambos "mantener presionado"), visibles solo con `matchMedia('(pointer: coarse)')`. No se agrega CSS de controles nuevo.
- Agregar la entrada `fuga-neon` al registry existente `components/games/registry.ts`, sin `hudLivesLabel` (usa el default `"Vidas"` con corazones).
- Pausa real (congela `update(dt)`, conserva el último frame) y game over real (perder la tercera vida) conectado al modal "FIN DEL JUEGO" existente.

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo (`gloton`, `invasores`, `ranaria`, `duelo-pixel` con simulación falsa; `asteroides`, `tetris`, `arkanoid`, `snake` con motor real) no cambian su comportamiento.
- Hackeo/EMP con carga, distritos temáticos con paleta propia, torretas que disparan y plataformas que colapsan — son el núcleo de la variante C.
- Vidas extra o power-ups (imán de chips, escudo) — se agregan en otro spec si el balance lo pide.
- Sprites o imágenes externas — todo es dibujo vectorial.
- Sonido/música — ningún juego de la plataforma lo tiene todavía.
- Pantalla de inicio propia, menú de pausa propio o récords en `localStorage` — la plataforma ya los cubre.
- Controles táctiles por gestos (swipe arriba/abajo sobre el canvas) — son botones fijos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('fuga-neon', 'FUGA NEÓN', 'Corre por las azoteas de una ciudad que nunca apaga sus luces.', 'Eres un mensajero sin licencia huyendo por los tejados de la megaciudad bajo la lluvia ácida. Salta entre edificios, deslízate bajo drones de vigilancia y barreras láser, y roba chips de datos para multiplicar tu puntaje. Tienes tres oportunidades antes de que la red te atrape.', 'ARCADE', 'cover-fuga-neon', 'magenta', 12640, '3.9K');
```

No hay `delete`: FUGA NEÓN no reemplaza ningún placeholder. `best`/`plays` son decorativos (fallback mientras `av_scores` no tenga filas para `fuga-neon`), elegidos en el rango de los demás juegos ARCADE del catálogo.

```ts
// components/games/fuga-neon/engine.ts
export interface EngineInput {
  keys: Record<string, boolean>; // por KeyboardEvent.code
  justPressed: Record<string, boolean>; // flanco de subida, consumido por el motor
}
export type GameState = "playing" | "gameover";

interface Rooftop {
  x: number; // borde izquierdo en pantalla (se desplaza hacia la izquierda)
  y: number; // altura del techo (380..500)
  w: number; // ancho (220..520)
  rescue?: boolean; // plataforma de rescate tras una caída (se dibuja con borde --yellow)
}
type HazardKind = "ac" | "laser" | "dron";
interface Hazard {
  kind: HazardKind; // ac: 34×30 en el techo; laser: 60×6 a 34 px sobre el techo; dron: 36×20 a 40 px sobre el techo, oscila ±6 px
  x: number;
  y: number;
  phase: number; // fase de oscilación (solo dron) o de parpadeo (solo laser)
}
interface Chip {
  x: number;
  y: number; // flota entre 30 y 140 px sobre el techo de su azotea
  taken: boolean;
}

export class FugaNeonEngine {
  score = 0; // Math.floor(distance / 10) + chipPoints
  lives = 3; // va a "Vidas" en .player-hud (corazones)
  level = 1; // 1 + Math.floor(metros / 800); va a "Nivel" en .player-hud
  state: GameState = "playing";
  chipStreak = 0; // chips seguidos sin recibir golpe; solo se ve en el HUD in-canvas
  invulnerable = 0; // segundos restantes de invulnerabilidad tras un golpe

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // azotea inicial larga, 3 vidas, score 0, level 1, racha 0
  forceGameOver(): void {} // state = "gameover", sin tocar el score
  update(dt: number): void {} // dt en segundos, clampeado a 0.05 por el componente
  draw(): void {} // skyline + lluvia + azoteas + peligros + chips + corredor + HUD (SCORE/NIVEL/VIDAS/xN)
}
```

Constantes de física y juego (px y segundos, tiempo real):

- `GRAVITY = 2200` px/s², `JUMP_VELOCITY = -820` px/s (altura máxima ≈ 153 px), `JUMP_CUT = 0.45`, `COYOTE_TIME = 0.08` s, `JUMP_BUFFER = 0.1` s.
- `FAST_FALL_VELOCITY = 900` px/s: mantener deslizar en el aire fija `vy` en al menos este valor.
- Hitbox del corredor: 28×44 px de pie, 28×24 px deslizándose (solo sobre un techo).
- `RUN_SPEED_BASE = 320` px/s, `SPEED_STEP = 1.07` por nivel, `RUN_SPEED_MAX = 700` px/s, `PX_PER_METER = 10`, `METERS_PER_LEVEL = 800`.
- `CHIP_POINTS = 25`, multiplicador `chipMult = Math.min(4, 1 + Math.floor(chipStreak / 5))`.
- `INVULNERABLE_TIME = 1.5` s, con el corredor parpadeando mientras dura.

Reglas del generador (`spawnRooftop`):

- Hueco entre azoteas en `[60, maxGap]`, con `maxGap = runSpeed * AIR_TIME * 0.75` y `AIR_TIME = 2 * |JUMP_VELOCITY| / GRAVITY` (≈ 0.745 s).
- Diferencia de altura con la azotea anterior en `[-60, +60]` px, con `y` limitado a `[380, 500]`.
- Cada azotea de al menos 300 px lleva como máximo un peligro, nunca a menos de 90 px de sus bordes, elegido entre los tipos desbloqueados por el nivel vigente. Un `"laser"` o `"dron"` nunca se genera en la misma azotea que un `"ac"`, para que no exista una combinación que exija saltar y deslizarse a la vez.
- Cada azotea lleva entre 0 y 5 chips en línea o en arco sobre el techo, nunca superpuestos con un peligro.

Reglas de golpe y caída:

- Tocar un peligro, o el lateral de una azotea más alta que los pies, con `invulnerable === 0` resta una vida, pone `chipStreak = 0` e `invulnerable = INVULNERABLE_TIME`.
- Caer por debajo de `height + 50` resta una vida y, si quedan vidas, inserta una azotea `rescue` de 360 px bajo `x = 160` en `y = 440`, elimina peligros a menos de 400 px por delante y reposiciona al corredor de pie sobre ella con invulnerabilidad.
- Llegar a `lives === 0` pone `state = "gameover"`.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma (`GameHandle`/`GameRegistryEntry` de SPEC 07), solo recibe la entrada nueva.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_fuga_neon.sql` con el `insert` de la fila `fuga-neon` del modelo de datos de arriba. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que `av_games` tiene la fila `fuga-neon` y que los cuatro placeholders siguen intactos.
2. Agregar `.cover-fuga-neon` en `app/globals.css`, junto a las demás clases `.cover-*`, diseñada con `/frontend-design`: degradado nocturno magenta→índigo de base, `::after` con siluetas de edificios escalonados, lluvia diagonal (`repeating-linear-gradient`) y un cono de luz de dron (`radial-gradient` `--cyan`), y `::before` con un glifo de corredor, usando `--magenta`/`--cyan`/`--ink`.
3. Crear `components/games/fuga-neon/engine.ts` con la base de movimiento: clase `FugaNeonEngine`, constantes del modelo de datos, `rooftops: Rooftop[]`, métodos privados `spawnRooftop()`, `updatePlayer(dt)` (gravedad, salto con `COYOTE_TIME`/`JUMP_BUFFER`/`JUMP_CUT`, deslizamiento con `ArrowDown`/`KeyS` sostenido sobre un techo, caída rápida con `FAST_FALL_VELOCITY` en el aire), `scrollWorld(dt)` y `updateLevel()` (recalcula `level` y `runSpeed = min(RUN_SPEED_BASE * SPEED_STEP^(level-1), RUN_SPEED_MAX)`). Aterrizaje por barrido: solo si `vy >= 0` y los pies cruzan el techo entre el frame anterior y el actual. `draw()` pinta skyline con parallax (0.2× y 0.5×), lluvia, azoteas con borde `--cyan` y el corredor (de pie o agachado). En este paso una caída ya termina la partida, para que el paso quede jugable.
4. En el mismo `engine.ts`, agregar peligros y chips: arrays `hazards: Hazard[]` y `chips: Chip[]` poblados por `spawnRooftop()` según las reglas de arriba, método privado `checkCollisions()` (hitbox de pie o agachada contra cada `Hazard`, contra laterales de azoteas, y recolección de `Chip`), método privado `loseLife(reason: "hit" | "fall")` con la lógica de invulnerabilidad y de plataforma `rescue`, y `chipPoints` acumulado que suma `CHIP_POINTS * chipMult` por chip. `draw()` agrega los peligros (láser `--magenta` parpadeante entre dos postes, dron con cono de luz `--cyan`), los chips (rombo `--yellow`), el parpadeo de invulnerabilidad y la franja de HUD superior de 24 px con SCORE, NIVEL, VIDAS y `xN`. Sin overlay de "GAME OVER" propio.
5. Crear `components/games/fuga-neon/fuga-neon-game.tsx` siguiendo `asteroids-game.tsx`: constantes `WIDTH = 800`/`HEIGHT = 600` y `PREVENT_DEFAULT_CODES = ["Space", "ArrowUp", "ArrowDown"]`, refs de último valor, canvas absoluto que llena `.crt-screen`, loop de `requestAnimationFrame` con `dt` clampeado a 0.05 (pausable con `paused`, `draw()` siempre), listeners `keydown`/`keyup` solo mientras está montado. `forwardRef` expone `restart()`, `forceGameOver()`, `pressJump(held)` (escribe `Space` en `input.keys`/`input.justPressed`) y `pressSlide(held)` (escribe `ArrowDown` en `input.keys`). Diffea `score`/`lives`/`level` cada frame y dispara `onGameOver(engine.score)` en la transición a `"gameover"`.
6. Crear `components/games/fuga-neon/touch-controls.tsx`: detección de `(pointer: coarse)` con `useSyncExternalStore` (snapshot de servidor `false`, `return null` si no es táctil), un `<button className="touch-btn touch-btn-fire">` "▲" con `aria-label="Saltar"` y un `<button className="touch-btn touch-btn-drop">` "▼" con `aria-label="Deslizar"`, ambos de tipo "mantener" (`onPointerDown` → `true`, `onPointerUp`/`onPointerLeave`/`onPointerCancel` → `false`). Se reutilizan las clases de Tetris tal cual, sin CSS nuevo.
7. Agregar la entrada `"fuga-neon"` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: FugaNeonGame`, `TouchControls: FugaNeonTouchControls`, sin `hudLivesLabel`), con el mismo cast `as unknown as` que las demás entradas.
8. Recorrer manualmente con `npm run dev`: la tarjeta "FUGA NEÓN" aparece en Inicio y Biblioteca con `cover-fuga-neon`; en `/juegos/fuga-neon/jugar` el corredor avanza solo, `Espacio`/`↑`/`W` saltan con altura variable, `↓`/`S` deslizan sobre el techo y aceleran la caída en el aire; en nivel 1 solo hay huecos y equipos de ventilación, en nivel 2 aparecen barreras láser y en nivel 3 drones; los chips suben el puntaje y el multiplicador `xN`; un golpe resta una vida (corazones del HUD) y hace parpadear al corredor; caer en un hueco con vidas restantes lo reaparece en una plataforma de rescate; perder la tercera vida abre el modal "FIN DEL JUEGO"; "PAUSA"/"REANUDAR"/"FIN"/"JUGAR DE NUEVO" funcionan como en Arkanoid; guardar la puntuación la agrega a `av_scores`; con emulación táctil aparecen los dos botones. Confirmar que Asteroides/Tetris/Arkanoid/Snake siguen igual vía el registry y que los placeholders siguen con la simulación falsa. Confirmar que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` tiene una fila `id: "fuga-neon"` con `title: "FUGA NEÓN"`, y los placeholders `gloton`, `invasores`, `ranaria` y `duelo-pixel` siguen existiendo.
- [ ] La tarjeta "FUGA NEÓN" aparece en `/` y `/biblioteca` con su cover propio (`cover-fuga-neon`), sin clase CSS faltante.
- [ ] `/juegos/fuga-neon` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `fuga-neon`.
- [ ] En `/juegos/fuga-neon/jugar` el corredor avanza solo desde el primer frame, sobre una azotea inicial sin peligros.
- [ ] `Espacio`, `↑` y `W` hacen saltar al corredor; un toque corto produce un salto visiblemente más bajo que mantener la tecla.
- [ ] Mantener `↓` o `S` sobre un techo agacha al corredor (hitbox de 24 px de alto) y permite pasar bajo barreras láser y drones; mantenerla en el aire acelera la caída.
- [ ] En nivel 1 solo aparecen huecos y obstáculos `"ac"`; las barreras láser aparecen desde el nivel 2 y los drones desde el nivel 3.
- [ ] Ninguna azotea tiene a la vez un obstáculo `"ac"` y un láser o dron, y ningún hueco es más ancho que lo que alcanza el salto máximo a la velocidad vigente.
- [ ] Recoger un chip suma `25 × xN` puntos; cada 5 chips seguidos sin golpe el multiplicador sube hasta `x4`, visible en el HUD in-canvas, y recibir un golpe lo vuelve a `x1`.
- [ ] El puntaje sube por metros recorridos más chips (motor real), no por temporizador, y no sube mientras el juego está en pausa.
- [ ] Cada 800 m sube el nivel (visible en `.player-hud` y en el HUD in-canvas) y la velocidad del mundo aumenta, sin superar 700 px/s.
- [ ] Un golpe contra un peligro o contra el lateral de una azotea resta exactamente una vida y deja al corredor parpadeando e inmune durante 1.5 s.
- [ ] Caer por un hueco con vidas restantes resta una vida y reaparece al corredor de pie sobre una plataforma de rescate con borde amarillo, sin peligros en los 400 px siguientes.
- [ ] Perder la tercera vida abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final.
- [ ] El HUD del reproductor (`.player-hud`, con "Vidas" en corazones) y el HUD in-canvas (SCORE/NIVEL/VIDAS) muestran siempre los mismos valores, sin desincronizarse.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, conserva el último frame, la invulnerabilidad no corre) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal "FIN DEL JUEGO" con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (azotea inicial, 3 vidas, puntaje 0, nivel 1, racha 0, velocidad base), no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "fuga-neon", score, name }`), visible recargando `/juegos/fuga-neon` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero aparecen los botones táctiles "Saltar" y "Deslizar" (ambos de mantener) y controlan al corredor; con mouse/teclado normal no aparecen.
- [ ] Salir de `/juegos/fuga-neon/jugar` no deja listeners de teclado activos en `window`.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual, y los placeholders siguen con la simulación falsa.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego diseñado desde cero (no hay material en `references/started-games/` ni `references/source-assets/`), retomando la sugerencia `fuga-neon` del `game-planner`. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** fila nueva sin `delete` — ningún placeholder describe un runner; reutilizar `ranaria` (cruce de autopista) cambiaría el juego que su copy promete. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** categoría `ARCADE`, color `magenta`, `best: 12640`, `plays: "3.9K"`. Magenta es el neón dominante de la estética cyberpunk y hoy solo lo usa `tetris`. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** cover nuevo `.cover-fuga-neon` con `/frontend-design` — ninguna clase existente representa una ciudad.
- **Sí:** saltar + deslizar como las dos acciones del juego — son las dos del concepto original del `game-planner`, y los drones/láseres a la altura de la cabeza son la forma directa de meter la vigilancia de la ciudad en la mecánica. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** peligros desbloqueados por nivel (`ac` → `laser` → `dron`) — el jugador aprende una amenaza a la vez y el nivel tiene significado de juego más allá de la velocidad. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** puntaje = metros + chips con multiplicador de racha hasta `x4` — premia el riesgo de ir a buscar chips en el aire y separa a los jugadores expertos en el leaderboard, que con metros solos se agruparían. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** tres vidas reales en la columna "Vidas" (corazones), sin `hudLivesLabel` — con peligros nuevos por nivel, morir al primer golpe frustraría el aprendizaje; mismo mapeo que Asteroides y Arkanoid. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** plataforma de rescate tras una caída — sin ella, una caída con vidas restantes no tendría dónde reaparecer al corredor.
- **Sí:** `dt` variable estándar de la plataforma con física en px/s — consistente con el resto de los motores.
- **Sí:** reutilizar `.touch-btn-fire` ("Saltar") y `.touch-btn-drop` ("Deslizar") de Tetris tal cual — dos botones de acción en la esquina derecha sin CSS nuevo; ambos de tipo "mantener" para respetar el salto variable y el deslizamiento sostenido. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** teclado `Space`/`ArrowUp`/`KeyW` para saltar y `ArrowDown`/`KeyS` para deslizar, con `preventDefault` en `Space`/`ArrowUp`/`ArrowDown`.
- **Sí:** se agrega la entrada al registry existente (creado en SPEC 07), sin tocar `jugar-client.tsx`.
- **No:** hackeo con carga, distritos y torretas — se dejan para la variante C; esta variante limita el alcance a esfuerzo M.
- **No:** power-ups (imán, escudo) y vidas extra — agregan balance sin cambiar la mecánica central.
- **No:** swipe sobre el canvas — el contrato táctil de la plataforma usa botones fijos.
- **No:** sonido, pantalla de inicio, pausa propia o récords locales — la plataforma ya los cubre y ningún juego tiene audio.

## Risks

| Riesgo                                                                                                                                                          | Mitigación                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El generador puede combinar un hueco máximo con un peligro justo en el borde de aterrizaje, creando un tramo imposible aunque cada regla por separado se cumpla | Los peligros nunca se ubican a menos de 90 px de los bordes de su azotea, y un `ac` nunca comparte azotea con un `laser`/`dron`; el recorrido manual del paso 8 incluye jugar hasta nivel 5 buscando tramos injustos. |
| Reaparecer tras una caída modifica el mundo (inserta la plataforma de rescate y borra peligros), lo que puede dejar una azotea cortada en pantalla              | La plataforma `rescue` se inserta ocupando todo el ancho visible a la izquierda del siguiente hueco, y el borrado solo afecta peligros, no azoteas.                                                                   |
| Los botones `.touch-btn-fire` y `.touch-btn-drop` están pensados para taps de Tetris; mantener ambos con el mismo pulgar puede generar toques cruzados          | Ambos son de tipo "mantener" con `onPointerLeave`/`onPointerCancel`, así que deslizar el pulgar de uno a otro suelta el primero; se prueba en el paso 8 con emulación táctil.                                         |
| Es el cuarto juego `ARCADE` del catálogo, lo que resta diversidad al filtro                                                                                     | Se acepta: un runner no encaja en `PUZZLE`/`SHOOTER`/`VERSUS`, y `CATS` no tiene otra categoría. Queda anotado para que el `game-planner` priorice otras categorías en el próximo juego.                              |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo.
- Hackeo/EMP, distritos temáticos, torretas y plataformas que colapsan (variante C).
- Power-ups y vidas extra.
- Sprites o imágenes externas.
- Sonido o música.
- Pantalla de inicio, pausa propia o récords en `localStorage`.
- Controles táctiles por gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
