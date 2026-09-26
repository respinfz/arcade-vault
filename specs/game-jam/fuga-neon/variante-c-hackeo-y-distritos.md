# SPEC GJ — Juego: FUGA NEÓN (Variante C: Hackeo y distritos)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-23
> **Objective:** Agregar FUGA NEÓN jugable al catálogo como runner infinito cyberpunk con salto, deslizamiento y un pulso EMP de hackeo alimentado por chips, que recorre distritos con peligros y paleta propios, con motor real diseñado desde cero, HUD sincronizado ("Carga" en lugar de "Vidas"), tres botones táctiles y leaderboard en `av_scores`.

## Por qué existe este spec

Este spec sale de la game jam de Arcade Vault con el tema **"Ciudad cyberpunk"**. El concepto elegido es un runner infinito: un mensajero-hacker huye por las azoteas de una megaciudad, atravesando sus distritos, mientras la red de seguridad intenta detenerlo. Retoma la sugerencia `fuga-neon` del agente `game-planner` (`references/game-suggestions-to-do.md`, 31/35, "runner infinito, saltar/agacharse, 2 botones táctiles") y la amplía con una tercera acción.

No hay ninguna carpeta en `references/started-games/` ni en `references/source-assets/` para este juego: el motor se diseña desde cero y todo se dibuja con figuras vectoriales.

**Esta variante (C) es la ambiciosa.** Sobre saltar y deslizar agrega un recurso central, la **carga de hackeo** (0 a 3), que se gana recogiendo chips de datos y cumple dos papeles: se gasta a voluntad en un pulso EMP que desactiva drones, láseres, torretas y balas por delante, o se consume sola como blindaje cuando el corredor recibe un golpe. No hay vidas: con carga 0, un golpe termina la partida, y una caída al vacío siempre la termina. El nivel es el **distrito** (Mercado Nocturno → Distrito Corporativo → Núcleo de Datos, y vuelve a empezar más rápido), cada uno con su paleta y sus peligros; el Núcleo agrega torretas que disparan y azoteas que colapsan. La variante A es la versión mínima de un botón; la variante B es salto + deslizamiento con tres vidas y sin hackeo. Las tres comparten el mismo `game-id` (`fuga-neon`), así que son **mutuamente excluyentes**: se implementa solo una.

FUGA NEÓN **no reemplaza ningún placeholder**: ninguno de los cuatro que quedan (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) describe un runner. Es una fila nueva en `av_games`, sin `delete`.

## Scope

**In:**

- Entrada nueva `fuga-neon` en `av_games` (vía migración SQL), con `title: "FUGA NEÓN"`, categoría `ARCADE`, color `magenta`, cover `cover-fuga-neon`, y `best`/`plays` decorativos plausibles.
- Clase de cover art nueva `.cover-fuga-neon` en `app/globals.css` (skyline en silueta, lluvia diagonal y un anillo de pulso EMP alrededor del corredor), diseñada con `/frontend-design`.
- Motor del juego en `components/games/fuga-neon/engine.ts`, diseñado desde cero, sin variables globales de `window`/`document`/canvas: corredor en `x = 160` fijo, mundo que se desplaza hacia la izquierda, gravedad, salto de altura variable, deslizamiento sostenido, caída rápida en el aire, generador procedural de azoteas con garantía de alcanzabilidad.
- Cinco tipos de peligro: obstáculos bajos (`"ac"`), barreras láser a la altura de la cabeza (`"laser"`), drones de vigilancia (`"dron"`), torretas que disparan balas horizontales (`"torreta"`) y azoteas que colapsan poco después de pisarlas (`collapsing`).
- Tres distritos cíclicos, uno por nivel, con paleta y peligros propios, y un cartel in-canvas de 1.5 s al entrar a cada uno (sin detener el juego).
- Chips de datos flotantes con multiplicador de racha `x1`..`x4`; la racha se reinicia cuando un chip sale de pantalla sin recogerse.
- Carga de hackeo (0 a 3): +1 cada 10 chips; `X` gasta 1 carga en un pulso EMP que destruye peligros y balas dentro de un radio por delante del corredor, sumando puntos; un golpe con carga ≥ 1 consume 1 carga como blindaje en vez de terminar la partida.
- Canvas lógico 800×600 (4:3), con fondo de skyline en dos capas de parallax, lluvia procedural y paleta por distrito.
- HUD in-canvas con SCORE, DISTRITO, CARGA (tres celdas) y `xN` en una franja superior, sincronizado con `.player-hud`.
- Componente `components/games/fuga-neon/fuga-neon-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressJump(held)`, `pressSlide(held)`, `pressHack()`) y props de callback `onScoreChange`/`onLivesChange` (recibe `engine.charge`)/`onLevelChange`/`onGameOver`.
- Controles táctiles `components/games/fuga-neon/touch-controls.tsx`: `.touch-btn-fire` reutilizado para "Saltar" y `.touch-btn-drop` reutilizado para "Deslizar" (ambos "mantener presionado"), más un botón nuevo `.touch-btn-hack` ("Hackear", tap) en la esquina inferior izquierda, diseñado con `/frontend-design`. Visibles solo con `matchMedia('(pointer: coarse)')`.
- Agregar la entrada `fuga-neon` al registry existente `components/games/registry.ts`, con `hudLivesLabel: "Carga"`.
- Pausa real (congela `update(dt)`, conserva el último frame) y game over real (golpe sin carga o caída al vacío) conectado al modal "FIN DEL JUEGO" existente.

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo (`gloton`, `invasores`, `ranaria`, `duelo-pixel` con simulación falsa; `asteroides`, `tetris`, `arkanoid`, `snake` con motor real) no cambian su comportamiento.
- Jefes de distrito, correr por paredes, gancho o cualquier acción más allá de saltar/deslizar/hackear.
- Selección de distrito inicial o "continuar desde el último distrito".
- Vidas clásicas o plataforma de rescate tras una caída — la carga es el único margen de error.
- Sprites o imágenes externas — todo es dibujo vectorial.
- Sonido/música — ningún juego de la plataforma lo tiene todavía.
- Pantalla de inicio propia, menú de pausa propio o récords en `localStorage` — la plataforma ya los cubre.
- Controles táctiles por gestos (swipe o tocar el canvas) — son botones fijos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('fuga-neon', 'FUGA NEÓN', 'Corre por las azoteas de una ciudad que nunca apaga sus luces.', 'Eres un mensajero-hacker huyendo por los tejados de la megaciudad. Salta, deslízate y roba chips de datos para cargar tu pulso EMP: fríe drones, láseres y torretas, o guárdalo como blindaje. Atraviesa el Mercado Nocturno, el Distrito Corporativo y el Núcleo de Datos, cada vez más rápido.', 'ARCADE', 'cover-fuga-neon', 'magenta', 12640, '3.9K');
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
  collapsing?: { timer: number | null; vy: number }; // solo Núcleo: timer arranca al pisarla
}
type HazardKind = "ac" | "laser" | "dron" | "torreta";
interface Hazard {
  kind: HazardKind; // torreta: 30×28 apoyada en el techo, dispara cada 1.6 s mientras está en pantalla
  x: number;
  y: number;
  phase: number; // oscilación (dron), parpadeo (laser) o cooldown de disparo (torreta)
}
interface Bullet {
  x: number;
  y: number; // 20 o 36 px sobre el techo: una se esquiva deslizando, la otra saltando
  vx: number; // -(runSpeed + 260) px/s
}
interface Chip {
  x: number;
  y: number;
  taken: boolean;
}
type District = "mercado" | "corporativo" | "nucleo";

export class FugaNeonEngine {
  score = 0; // Math.floor(distance / 10) + bonusPoints (chips + EMP)
  charge = 1; // 0..3; va a la columna "Carga" de .player-hud vía onLivesChange (hudLivesLabel)
  level = 1; // número de distrito (1, 2, 3, 4, ...); va a "Nivel" en .player-hud
  state: GameState = "playing";
  chipStreak = 0; // solo en el HUD in-canvas (xN)
  district: District = "mercado"; // DISTRICTS[(level - 1) % 3]

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // azotea inicial larga, carga 1, score 0, distrito 1, racha 0
  forceGameOver(): void {} // state = "gameover", sin tocar el score
  update(dt: number): void {} // dt en segundos, clampeado a 0.05 por el componente
  draw(): void {} // skyline por distrito + lluvia + mundo + balas + EMP + HUD (SCORE/DISTRITO/CARGA/xN)
}
```

Constantes de física y juego (px y segundos, tiempo real):

- `GRAVITY = 2200` px/s², `JUMP_VELOCITY = -820` px/s (altura máxima ≈ 153 px), `JUMP_CUT = 0.45`, `COYOTE_TIME = 0.08` s, `JUMP_BUFFER = 0.1` s, `FAST_FALL_VELOCITY = 900` px/s.
- Hitbox del corredor: 28×44 px de pie, 28×24 px deslizándose (solo sobre un techo).
- `RUN_SPEED_BASE = 320` px/s, `SPEED_STEP = 1.10` por distrito, `RUN_SPEED_MAX = 760` px/s, `PX_PER_METER = 10`, `METERS_PER_DISTRICT = 1500`.
- `CHIP_POINTS = 25`, `chipMult = Math.min(4, 1 + Math.floor(chipStreak / 5))`, `CHIPS_PER_CHARGE = 10`, `MAX_CHARGE = 3`.
- `EMP_RADIUS = 260` px (solo por delante del corredor), `EMP_POINTS_DRONE = 150` y `EMP_POINTS_TURRET = 150` (× `chipMult`), `EMP_POINTS_LASER = 50`, `EMP_COOLDOWN = 0.4` s.
- `ARMOR_INVULNERABLE_TIME = 1.0` s tras consumir carga como blindaje.
- `COLLAPSE_DELAY = 0.5` s, `COLLAPSE_SPEED = 400` px/s.

Tabla de distritos (`DISTRICTS`), que cicla con `(level - 1) % 3`:

| Distrito              | Paleta de fondo          | Peligros que genera                                      |
| --------------------- | ------------------------ | -------------------------------------------------------- |
| `mercado` (1, 4, 7…)  | `--magenta` + `--yellow` | huecos, `ac`                                             |
| `corporativo` (2, 5…) | `--cyan` + `--ink`       | huecos, `ac`, `laser`, `dron`                            |
| `nucleo` (3, 6…)      | `--green` + `--magenta`  | huecos, `laser`, `dron`, `torreta`, azoteas `collapsing` |

Desde el distrito 4 el ciclo repite paletas, pero cada distrito siguiente conserva todos los peligros del Núcleo y solo cambia la paleta y la velocidad.

Reglas del generador (`spawnRooftop`):

- Hueco entre azoteas en `[60, maxGap]`, con `maxGap = runSpeed * AIR_TIME * 0.75` y `AIR_TIME = 2 * |JUMP_VELOCITY| / GRAVITY` (≈ 0.745 s).
- Diferencia de altura con la azotea anterior en `[-60, +60]` px, con `y` limitado a `[380, 500]`.
- Cada azotea de al menos 300 px lleva como máximo un peligro, nunca a menos de 90 px de sus bordes; un `ac` nunca comparte azotea con un `laser`/`dron`/`torreta`.
- Una azotea `collapsing` nunca lleva peligros y nunca va seguida del hueco máximo.
- Cada azotea lleva entre 0 y 5 chips, nunca superpuestos con un peligro.

Reglas de golpe y de carga:

- Tocar un peligro, una bala o el lateral de una azotea más alta con `charge >= 1` resta 1 carga y da `ARMOR_INVULNERABLE_TIME` de invulnerabilidad (el corredor parpadea).
- Tocarlo con `charge === 0`, o caer por debajo de `height + 50` (siempre), pone `state = "gameover"`.
- `KeyX` con `charge >= 1` y sin cooldown resta 1 carga, dibuja un anillo expansivo `--cyan` y elimina `dron`, `laser`, `torreta` y balas dentro de `EMP_RADIUS` por delante del corredor; los `ac` y las azoteas no se ven afectados.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma (`GameHandle`/`GameRegistryEntry` de SPEC 07, que ya incluye `hudLivesLabel`), solo recibe la entrada nueva.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_fuga_neon.sql` con el `insert` de la fila `fuga-neon` del modelo de datos de arriba. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que `av_games` tiene la fila `fuga-neon` y que los cuatro placeholders siguen intactos.
2. Agregar `.cover-fuga-neon` en `app/globals.css`, junto a las demás clases `.cover-*`, diseñada con `/frontend-design`: degradado nocturno magenta→índigo de base, `::after` con siluetas de edificios escalonados, lluvia diagonal (`repeating-linear-gradient`) y un anillo EMP (`radial-gradient` `--cyan`), y `::before` con un glifo de corredor, usando `--magenta`/`--cyan`/`--ink`.
3. Crear `components/games/fuga-neon/engine.ts` con la base de movimiento: clase `FugaNeonEngine`, constantes del modelo de datos, `rooftops: Rooftop[]`, métodos privados `spawnRooftop()`, `updatePlayer(dt)` (gravedad, salto con `COYOTE_TIME`/`JUMP_BUFFER`/`JUMP_CUT`, deslizamiento con `ArrowDown`/`KeyS` sobre un techo, caída rápida en el aire), `scrollWorld(dt)` y aterrizaje por barrido (solo si `vy >= 0` y los pies cruzan el techo entre el frame anterior y el actual). `draw()` pinta skyline con parallax (0.2× y 0.5×), lluvia, azoteas y el corredor, y la franja de HUD superior de 24 px con SCORE. En este paso una caída ya termina la partida.
4. En el mismo `engine.ts`, agregar distritos: constante `DISTRICTS` con paleta y lista de peligros permitidos, método privado `updateDistrict()` (recalcula `level = 1 + Math.floor(metros / METERS_PER_DISTRICT)`, `district`, `runSpeed = min(RUN_SPEED_BASE * SPEED_STEP^(level-1), RUN_SPEED_MAX)` y dispara el cartel "DISTRITO N — NOMBRE" de 1.5 s dibujado sobre el juego sin detenerlo). `draw()` toma los colores del skyline y de los bordes de azotea del distrito vigente y agrega DISTRITO al HUD in-canvas.
5. En el mismo `engine.ts`, agregar peligros y chips: arrays `hazards: Hazard[]`, `bullets: Bullet[]` y `chips: Chip[]` poblados por `spawnRooftop()` según el distrito, lógica de disparo de torretas (`phase` como cooldown de 1.6 s, alternando bala baja y alta), caída de azoteas `collapsing` tras `COLLAPSE_DELAY`, método privado `checkCollisions()` y método privado `takeHit()` con la regla de blindaje por carga. Los chips suman `CHIP_POINTS * chipMult` a `bonusPoints`, incrementan `chipStreak` y cada `CHIPS_PER_CHARGE` suman 1 a `charge` (máximo `MAX_CHARGE`); un chip que sale de pantalla sin recogerse pone `chipStreak = 0`. `draw()` agrega peligros, balas, chips, el parpadeo de invulnerabilidad, CARGA (tres celdas) y `xN` al HUD. Sin overlay de "GAME OVER" propio.
6. En el mismo `engine.ts`, agregar el pulso EMP: método privado `triggerEmp()` disparado por `justPressed["KeyX"]`, con `EMP_COOLDOWN`, eliminación de peligros y balas dentro de `EMP_RADIUS` por delante, puntos por tipo multiplicados por `chipMult`, y un anillo expansivo de 0.3 s en `draw()`. Presionar `X` con carga 0 no hace nada visible salvo un parpadeo rojo de la celda de CARGA vacía.
7. Crear `components/games/fuga-neon/fuga-neon-game.tsx` siguiendo `asteroids-game.tsx`: constantes `WIDTH = 800`/`HEIGHT = 600` y `PREVENT_DEFAULT_CODES = ["Space", "ArrowUp", "ArrowDown"]`, refs de último valor, canvas absoluto que llena `.crt-screen`, loop de `requestAnimationFrame` con `dt` clampeado a 0.05 (pausable con `paused`, `draw()` siempre), listeners `keydown`/`keyup` solo mientras está montado. `forwardRef` expone `restart()`, `forceGameOver()`, `pressJump(held)` (escribe `Space`), `pressSlide(held)` (escribe `ArrowDown`) y `pressHack()` (escribe `KeyX` en `input.justPressed`). Diffea `score`/`charge`/`level` cada frame: `onLivesChange(engine.charge)`. Dispara `onGameOver(engine.score)` en la transición a `"gameover"`.
8. Crear `components/games/fuga-neon/touch-controls.tsx`: detección de `(pointer: coarse)` con `useSyncExternalStore` (snapshot de servidor `false`, `return null` si no es táctil), `<button className="touch-btn touch-btn-fire">` "▲" (`aria-label="Saltar"`, mantener), `<button className="touch-btn touch-btn-drop">` "▼" (`aria-label="Deslizar"`, mantener) y `<button className="touch-btn touch-btn-hack">` "EMP" (`aria-label="Hackear"`, tap con `onPointerDown`). Agregar en `app/globals.css` la clase `.touch-btn-hack` diseñada con `/frontend-design`: círculo de 60×60 px en la esquina inferior izquierda (`left: 18px; bottom: 18px`), color `--cyan`, con estado `:active` con glow, mismo patrón que `.touch-btn-fire`.
9. Agregar la entrada `"fuga-neon"` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: FugaNeonGame`, `TouchControls: FugaNeonTouchControls`, `hudLivesLabel: "Carga"`), con el mismo cast `as unknown as` que las demás entradas. `jugar-client.tsx` ya muestra el valor como número plano cuando el rótulo no es `"Vidas"`, sin cambios.
10. Recorrer manualmente con `npm run dev`: la tarjeta "FUGA NEÓN" aparece en Inicio y Biblioteca con `cover-fuga-neon`; en `/juegos/fuga-neon/jugar` el corredor avanza solo, salta con altura variable y desliza; el Mercado solo tiene huecos y equipos de ventilación; a los 1500 m aparece el cartel "DISTRITO 2 — CORPORATIVO", cambia la paleta y aparecen láseres y drones; a los 3000 m el Núcleo agrega torretas y azoteas que colapsan; recoger 10 chips sube la columna "Carga" del HUD; `X` con carga destruye drones/láseres/torretas/balas cercanos y suma puntos; un golpe con carga la consume y hace parpadear al corredor; un golpe sin carga o una caída abren el modal "FIN DEL JUEGO"; "PAUSA"/"REANUDAR"/"FIN"/"JUGAR DE NUEVO" funcionan como en Tetris; guardar la puntuación la agrega a `av_scores`; con emulación táctil aparecen los tres botones. Confirmar que Asteroides/Tetris/Arkanoid/Snake siguen igual vía el registry y que los placeholders siguen con la simulación falsa. Confirmar que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` tiene una fila `id: "fuga-neon"` con `title: "FUGA NEÓN"`, y los placeholders `gloton`, `invasores`, `ranaria` y `duelo-pixel` siguen existiendo.
- [ ] La tarjeta "FUGA NEÓN" aparece en `/` y `/biblioteca` con su cover propio (`cover-fuga-neon`), sin clase CSS faltante.
- [ ] `/juegos/fuga-neon` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `fuga-neon`.
- [ ] En `/juegos/fuga-neon/jugar` el corredor avanza solo desde el primer frame, sobre una azotea inicial sin peligros, con 1 carga.
- [ ] `Espacio`, `↑` y `W` hacen saltar al corredor con altura variable; `↓` y `S` lo agachan sobre un techo y aceleran la caída en el aire.
- [ ] Cada 1500 m cambia el distrito: aparece durante 1.5 s el cartel "DISTRITO N — NOMBRE" sin detener el juego, cambia la paleta del fondo, sube el "Nivel" en `.player-hud` y la velocidad aumenta sin superar 760 px/s.
- [ ] El Mercado (distrito 1) solo genera huecos y obstáculos `ac`; el Corporativo agrega láseres y drones; el Núcleo agrega torretas que disparan balas y azoteas que caen 0.5 s después de pisarlas.
- [ ] Las torretas alternan balas bajas (se esquivan saltando) y altas (se esquivan deslizando).
- [ ] Recoger un chip suma `25 × xN`; cada 5 chips seguidos el multiplicador sube hasta `x4`, y dejar pasar un chip sin recogerlo lo vuelve a `x1`.
- [ ] Cada 10 chips recogidos la carga sube en 1, hasta un máximo de 3, visible en la columna "Carga" de `.player-hud` (número plano) y en las celdas CARGA del HUD in-canvas.
- [ ] Presionar `X` con carga ≥ 1 resta 1 carga, muestra un anillo EMP y elimina drones, láseres, torretas y balas dentro de 260 px por delante del corredor, sumando sus puntos; con carga 0 no elimina nada.
- [ ] Recibir un golpe con carga ≥ 1 resta exactamente 1 carga y deja al corredor parpadeando e inmune durante 1 s, sin terminar la partida.
- [ ] Recibir un golpe con carga 0, o caer por un hueco con cualquier carga, abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final.
- [ ] El puntaje sube por metros, chips y EMP (motor real), no por temporizador, y no sube mientras el juego está en pausa.
- [ ] El HUD del reproductor (`.player-hud`, con "Carga" y "Nivel") y el HUD in-canvas (SCORE/DISTRITO/CARGA) muestran siempre los mismos valores, sin desincronizarse.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, conserva el último frame; torretas, colapsos y cartel de distrito no avanzan) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal "FIN DEL JUEGO" con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (azotea inicial, carga 1, puntaje 0, distrito 1, racha 0, velocidad base), no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "fuga-neon", score, name }`), visible recargando `/juegos/fuga-neon` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero aparecen los botones táctiles "Saltar" y "Deslizar" (derecha, mantener) y "Hackear" (izquierda, tap), de al menos 44×44 px, y controlan al corredor; con mouse/teclado normal no aparecen.
- [ ] Salir de `/juegos/fuga-neon/jugar` no deja listeners de teclado activos en `window`.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual (Tetris sigue mostrando "Líneas"), y los placeholders siguen con la simulación falsa.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego diseñado desde cero (no hay material en `references/started-games/` ni `references/source-assets/`), retomando y ampliando la sugerencia `fuga-neon` del `game-planner`. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** fila nueva sin `delete` — ningún placeholder describe un runner; reutilizar `ranaria` (cruce de autopista) cambiaría el juego que su copy promete. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** categoría `ARCADE`, color `magenta`, `best: 12640`, `plays: "3.9K"`. Magenta es el neón dominante de la estética cyberpunk y hoy solo lo usa `tetris`. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** cover nuevo `.cover-fuga-neon` con `/frontend-design` — ninguna clase existente representa una ciudad.
- **Sí:** hackeo EMP como tercera acción — es la mecánica más propia del tema (el jugador ataca la red de la ciudad, no solo la esquiva) y le da al runner una decisión táctica además de reflejos. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** la carga es a la vez munición y blindaje, sin vidas clásicas — un único recurso con dos usos obliga a elegir entre gastar para sumar puntos o guardar para sobrevivir, y evita la plataforma de rescate de la variante B. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** la columna "Vidas" de `.player-hud` se reutiliza como "Carga" (`hudLivesLabel: "Carga"`, número plano 0–3), mismo mecanismo que Tetris con "Líneas" — la carga es el margen de error real del jugador y cambia durante la partida. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** el nivel es el distrito (cada 1500 m), con tres distritos cíclicos de paleta y peligros propios y cartel no bloqueante — convierte la progresión en algo visible y temático; a diferencia del `levelComplete` de Arkanoid, no detiene el juego porque un runner no tiene pausas naturales. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** la racha de chips se reinicia al dejar pasar un chip (no al recibir un golpe) — con blindaje por carga los golpes son raros de sobrevivir, así que el reinicio por golpe casi no tendría efecto. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** las caídas siempre terminan la partida, aunque haya carga — el blindaje protege de golpes, no del vacío, y así no hace falta reaparecer al corredor.
- **Sí:** `dt` variable estándar de la plataforma con física en px/s — consistente con el resto de los motores.
- **Sí:** táctil con `.touch-btn-fire` ("Saltar") y `.touch-btn-drop` ("Deslizar") reutilizados a la derecha, más un `.touch-btn-hack` nuevo a la izquierda diseñado con `/frontend-design` — el EMP es una acción puntual que conviene separar del pulgar que salta y desliza. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** teclado `Space`/`ArrowUp`/`KeyW` (saltar), `ArrowDown`/`KeyS` (deslizar) y `KeyX` (hackear), con `preventDefault` en `Space`/`ArrowUp`/`ArrowDown`.
- **Sí:** se agrega la entrada al registry existente (creado en SPEC 07), que ya soporta `hudLivesLabel`, sin tocar `jugar-client.tsx`.
- **No:** jefes de distrito, correr por paredes o gancho — cada uno multiplica el alcance de un spec que ya es L.
- **No:** selección de distrito inicial — la partida siempre arranca en el Mercado, igual que los demás juegos arrancan en nivel 1.
- **No:** swipe sobre el canvas — el contrato táctil de la plataforma usa botones fijos.
- **No:** sonido, pantalla de inicio, pausa propia o récords locales — la plataforma ya los cubre y ningún juego tiene audio.

## Risks

| Riesgo                                                                                                                                                               | Mitigación                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Es el motor más grande de la plataforma (cinco peligros, balas, distritos, recurso doble); el spec es esfuerzo L y puede no caber en una sola sesión de `/spec-impl` | El plan separa el motor en cuatro pasos (base, distritos, peligros/chips, EMP), cada uno jugable por sí solo; si el alcance se desborda, los pasos 5–6 pueden bajarse al alcance de la variante B sin cambiar el `game-id`.              |
| Con una sola "vida" efectiva y peligros que se suman por distrito, la curva puede ser demasiado punitiva y los puntajes muy bajos                                    | La partida arranca con 1 carga, el Mercado no tiene drones ni torretas, y el blindaje por carga da margen; los valores (`CHIPS_PER_CHARGE`, `METERS_PER_DISTRICT`) son constantes de módulo fáciles de ajustar tras el recorrido manual. |
| Torretas + azoteas que colapsan + hueco máximo pueden combinarse en un tramo imposible                                                                               | Una azotea `collapsing` nunca lleva peligros ni va seguida del hueco máximo, y un `ac` nunca comparte azotea con otro peligro; las balas alternan alturas para que siempre haya una respuesta (saltar o deslizar) además del EMP.        |
| Un botón nuevo en la esquina inferior izquierda (`.touch-btn-hack`) puede tapar parte del corredor, que corre en `x = 160` cerca del borde izquierdo                 | El botón va en `bottom: 18px`, por debajo de la altura mínima de las azoteas (`y ≥ 380` sobre 600 lógicos), y se valida con emulación móvil en el paso 10.                                                                               |
| Es el cuarto juego `ARCADE` del catálogo, lo que resta diversidad al filtro                                                                                          | Se acepta: un runner no encaja en `PUZZLE`/`SHOOTER`/`VERSUS`, y `CATS` no tiene otra categoría. Queda anotado para que el `game-planner` priorice otras categorías en el próximo juego.                                                 |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo.
- Jefes de distrito, correr por paredes, gancho u otras acciones.
- Selección de distrito inicial.
- Vidas clásicas o plataforma de rescate.
- Sprites o imágenes externas.
- Sonido o música.
- Pantalla de inicio, pausa propia o récords en `localStorage`.
- Controles táctiles por gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
