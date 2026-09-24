# SPEC GJ — Juego: FUGA NEÓN (Variante A: Azotea clásica)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-23
> **Objective:** Agregar FUGA NEÓN jugable al catálogo como runner infinito de un solo botón (saltar) sobre azoteas de una ciudad cyberpunk, con motor real diseñado desde cero, HUD sincronizado, un botón táctil y leaderboard en `av_scores`.

## Por qué existe este spec

Este spec sale de la game jam de Arcade Vault con el tema **"Ciudad cyberpunk"**. El concepto elegido es un runner infinito: un mensajero huye por las azoteas de una megaciudad bajo la lluvia, saltando entre edificios y esquivando antenas y equipos de aire acondicionado, mientras la ciudad acelera. Retoma la sugerencia `fuga-neon` del agente `game-planner` (`references/game-suggestions-to-do.md`, 31/35, "runner infinito, saltar/agacharse, 2 botones táctiles").

No hay ninguna carpeta en `references/started-games/` ni en `references/source-assets/` para este juego: el motor se diseña desde cero y todo se dibuja con figuras vectoriales, igual que Asteroides/Tetris/Arkanoid.

**Esta variante (A) es la mínima:** una sola acción (saltar, con altura variable según cuánto se mantiene la tecla), una sola vida y puntaje igual a los metros recorridos. Es lo más barato que ya es divertido. La variante B agrega deslizarse, drones, chips de datos y tres vidas; la variante C agrega hackeo con carga, distritos temáticos y torretas. Las tres comparten el mismo `game-id` (`fuga-neon`), así que son **mutuamente excluyentes**: se implementa solo una.

FUGA NEÓN **no reemplaza ningún placeholder**: ninguno de los cuatro que quedan (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) describe un runner. Es una fila nueva en `av_games`, sin `delete`.

## Scope

**In:**

- Entrada nueva `fuga-neon` en `av_games` (vía migración SQL), con `title: "FUGA NEÓN"`, categoría `ARCADE`, color `magenta`, cover `cover-fuga-neon`, y `best`/`plays` decorativos plausibles.
- Clase de cover art nueva `.cover-fuga-neon` en `app/globals.css` (skyline de edificios en silueta, lluvia diagonal y un corredor en salto), diseñada con `/frontend-design`.
- Motor del juego en `components/games/fuga-neon/engine.ts`, diseñado desde cero, sin variables globales de `window`/`document`/canvas: corredor en `x = 160` fijo, mundo que se desplaza hacia la izquierda, gravedad, salto de altura variable, generador procedural de azoteas con garantía de alcanzabilidad, dos tipos de obstáculo sobre las azoteas (`"ac"` y `"antena"`), velocidad que sube por nivel.
- Canvas lógico 800×600 (4:3, mismo tamaño que el resto de los juegos), con fondo de skyline en dos capas de parallax y lluvia procedural.
- HUD in-canvas con SCORE (metros) y NIVEL en una franja superior, sincronizado con `.player-hud`.
- Componente `components/games/fuga-neon/fuga-neon-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressJump(held)`) y props de callback `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.
- Controles táctiles `components/games/fuga-neon/touch-controls.tsx`: un único botón `.touch-btn-fire` reutilizado tal cual ("SALTAR", mantener presionado), visible solo con `matchMedia('(pointer: coarse)')`. No se agrega CSS de controles nuevo.
- Agregar la entrada `fuga-neon` al registry existente `components/games/registry.ts`, sin `hudLivesLabel` (usa el default `"Vidas"`).
- Pausa real (congela `update(dt)`, conserva el último frame) y game over real (caer al vacío o chocar contra un obstáculo o contra la pared de una azotea más alta) conectado al modal "FIN DEL JUEGO" existente.
- Una sola vida: `lives` vale siempre `1` mientras `state === "playing"`, mismo caso que Snake (SPEC 09).

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo (`gloton`, `invasores`, `ranaria`, `duelo-pixel` con simulación falsa; `asteroides`, `tetris`, `arkanoid`, `snake` con motor real) no cambian su comportamiento.
- Deslizarse/agacharse, drones, barreras láser y coleccionables — son el núcleo de la variante B.
- Hackeo, distritos temáticos y torretas — son el núcleo de la variante C.
- Varias vidas o escudos de invulnerabilidad.
- Sprites o imágenes externas — todo es dibujo vectorial.
- Sonido/música — ningún juego de la plataforma lo tiene todavía.
- Pantalla de inicio propia, menú de pausa propio o récords en `localStorage` — la plataforma ya los cubre.
- Controles táctiles por gestos (tocar el canvas para saltar) — es un botón fijo.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('fuga-neon', 'FUGA NEÓN', 'Corre por las azoteas de una ciudad que nunca apaga sus luces.', 'Eres un mensajero sin licencia huyendo por los tejados de la megaciudad bajo la lluvia ácida. Salta entre edificios, esquiva antenas y equipos de ventilación, y no mires abajo: cada metro suma, y la ciudad corre cada vez más rápido.', 'ARCADE', 'cover-fuga-neon', 'magenta', 12640, '3.9K');
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
  x: number; // borde izquierdo en coordenadas de pantalla (se desplaza hacia la izquierda)
  y: number; // altura del techo (380..500)
  w: number; // ancho (220..520)
}
interface Obstacle {
  kind: "ac" | "antena"; // ac: 34×30, antena: 12×64
  x: number;
  y: number; // base, apoyada sobre el techo de su azotea
}

export class FugaNeonEngine {
  score = 0; // metros recorridos: Math.floor(distance / 10)
  lives = 1; // fijo mientras state === "playing"; va a "Vidas" en .player-hud
  level = 1; // 1 + Math.floor(metros / 800); va a "Nivel" en .player-hud
  state: GameState = "playing";

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // azotea inicial larga, corredor apoyado, score 0, level 1
  forceGameOver(): void {} // state = "gameover", sin tocar el score
  update(dt: number): void {} // dt en segundos, clampeado a 0.05 por el componente
  draw(): void {} // skyline + lluvia + azoteas + obstáculos + corredor + HUD (SCORE/NIVEL)
}
```

Constantes de física (px y segundos, tiempo real):

- `GRAVITY = 2200` px/s².
- `JUMP_VELOCITY = -820` px/s → altura máxima ≈ 153 px con la tecla mantenida.
- `JUMP_CUT = 0.45`: soltar la tecla mientras el corredor sube multiplica `vy` por este factor (salto corto).
- `COYOTE_TIME = 0.08` s y `JUMP_BUFFER = 0.1` s: tolerancias para saltar justo después de dejar el borde o justo antes de aterrizar.
- `RUN_SPEED_BASE = 320` px/s, `SPEED_STEP = 1.08` por nivel, `RUN_SPEED_MAX = 720` px/s.
- Escala de puntaje: `PX_PER_METER = 10`.
- Hitbox del corredor: 28×44 px, con los pies en `y` del techo al aterrizar.

Reglas del generador de azoteas (`spawnRooftop`):

- Genera mientras el borde derecho de la última azotea esté a menos de `width + 200` px.
- Hueco entre azoteas aleatorio en `[60, maxGap]`, con `maxGap = runSpeed * AIR_TIME * 0.75` y `AIR_TIME = 2 * |JUMP_VELOCITY| / GRAVITY` (≈ 0.745 s): nunca genera un salto imposible a la velocidad actual.
- Diferencia de altura con la azotea anterior en `[-60, +60]` px, con `y` limitado a `[380, 500]`.
- Cada azotea de al menos 300 px de ancho tiene 50% de probabilidad de llevar un obstáculo (`"ac"` o `"antena"` al 50%), nunca a menos de 90 px de sus bordes.
- La primera azotea de `restart()` mide 900 px y no lleva obstáculos.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma (`GameHandle`/`GameRegistryEntry` de SPEC 07), solo recibe la entrada nueva.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_fuga_neon.sql` con el `insert` de la fila `fuga-neon` del modelo de datos de arriba. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que `av_games` tiene la fila `fuga-neon` y que los cuatro placeholders siguen intactos.
2. Agregar `.cover-fuga-neon` en `app/globals.css`, junto a las demás clases `.cover-*`, diseñada con `/frontend-design`: degradado nocturno magenta→índigo de base, `::after` con siluetas de edificios en `linear-gradient` escalonados y lluvia diagonal en `repeating-linear-gradient`, y `::before` con un glifo de corredor en salto, usando `--magenta`/`--cyan`/`--ink`.
3. Crear `components/games/fuga-neon/engine.ts`: clase `FugaNeonEngine` con las constantes del modelo de datos, los arrays `rooftops: Rooftop[]` y `obstacles: Obstacle[]`, y los métodos privados `spawnRooftop()`, `updatePlayer(dt)` (gravedad, salto con `COYOTE_TIME`/`JUMP_BUFFER`/`JUMP_CUT`), `scrollWorld(dt)` (mueve azoteas y obstáculos `runSpeed * dt` hacia la izquierda, suma a `distance`, descarta lo que salió de pantalla), `checkCollisions()` y `updateLevel()`. Colisiones: aterrizar solo si `vy >= 0` y los pies cruzan el techo entre el frame anterior y el actual; tocar el lateral de una azotea más alta que los pies, o la hitbox de un obstáculo, o caer por debajo de `height + 50` → `state = "gameover"`. `updateLevel()` recalcula `level` desde los metros y ajusta `runSpeed = min(RUN_SPEED_BASE * SPEED_STEP^(level-1), RUN_SPEED_MAX)`. Salto: `Space`/`ArrowUp`/`KeyW` en `justPressed` lo inicia; soltar las tres mientras `vy < 0` aplica `JUMP_CUT`. `draw()` pinta dos capas de skyline con parallax (0.2× y 0.5× de `runSpeed`), lluvia procedural, azoteas con borde neón `--cyan`, obstáculos, el corredor (silueta con estela `--magenta`) y la franja de HUD superior de 24 px con SCORE y NIVEL. Sin overlay de "GAME OVER" propio.
4. Crear `components/games/fuga-neon/fuga-neon-game.tsx` siguiendo `asteroids-game.tsx`: constantes `WIDTH = 800`/`HEIGHT = 600` y `PREVENT_DEFAULT_CODES = ["Space", "ArrowUp"]`, refs de último valor, canvas absoluto que llena `.crt-screen`, loop de `requestAnimationFrame` con `dt` clampeado a 0.05 (pausable con `paused`, `draw()` siempre), listeners `keydown`/`keyup` solo mientras está montado. `forwardRef` expone `restart()`, `forceGameOver()` y `pressJump(held)` (escribe `Space` en `input.keys`, y en `input.justPressed` al pasar a `true`). Diffea `score`/`lives`/`level` cada frame y dispara `onGameOver(engine.score)` en la transición a `"gameover"`.
5. Crear `components/games/fuga-neon/touch-controls.tsx`: detección de `(pointer: coarse)` con `useSyncExternalStore` (snapshot de servidor `false`, `return null` si no es táctil), un único `<button className="touch-btn touch-btn-fire">` con `aria-label="Saltar"` y texto "▲", de tipo "mantener" (`onPointerDown` → `pressJump(true)`, `onPointerUp`/`onPointerLeave`/`onPointerCancel` → `pressJump(false)`), para que el salto variable funcione igual que con teclado. Se reutiliza `.touch-btn-fire` tal cual, sin CSS nuevo.
6. Agregar la entrada `"fuga-neon"` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: FugaNeonGame`, `TouchControls: FugaNeonTouchControls`, sin `hudLivesLabel`), con el mismo cast `as unknown as` que las demás entradas.
7. Recorrer manualmente con `npm run dev`: la tarjeta "FUGA NEÓN" aparece en Inicio y Biblioteca con `cover-fuga-neon`; en `/juegos/fuga-neon/jugar` el corredor avanza solo, `Espacio`/`↑`/`W` saltan (tap corto = salto bajo, mantener = salto alto), el SCORE sube con los metros, cada 800 m sube el nivel y la ciudad corre más rápido; caer en un hueco o chocar abre el modal "FIN DEL JUEGO"; "PAUSA"/"REANUDAR"/"FIN"/"JUGAR DE NUEVO" funcionan como en Snake; guardar la puntuación la agrega a `av_scores`; con emulación táctil aparece solo el botón de salto. Confirmar que Asteroides/Tetris/Arkanoid/Snake siguen igual vía el registry y que los placeholders siguen con la simulación falsa. Confirmar que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` tiene una fila `id: "fuga-neon"` con `title: "FUGA NEÓN"`, y los placeholders `gloton`, `invasores`, `ranaria` y `duelo-pixel` siguen existiendo.
- [ ] La tarjeta "FUGA NEÓN" aparece en `/` y `/biblioteca` con su cover propio (`cover-fuga-neon`), sin clase CSS faltante.
- [ ] `/juegos/fuga-neon` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `fuga-neon`.
- [ ] En `/juegos/fuga-neon/jugar` el corredor avanza solo desde el primer frame, sobre una azotea inicial sin obstáculos.
- [ ] `Espacio`, `↑` y `W` hacen saltar al corredor; un toque corto produce un salto visiblemente más bajo que mantener la tecla.
- [ ] Presionar salto hasta 0.1 s antes de aterrizar, o hasta 0.08 s después de dejar el borde, igual produce el salto.
- [ ] El puntaje sube por los metros recorridos (1 punto cada 10 px de desplazamiento), no por temporizador, y no sube mientras el juego está en pausa.
- [ ] Cada 800 m sube el nivel (visible en `.player-hud` y en el HUD in-canvas) y la velocidad del mundo aumenta, sin superar 720 px/s.
- [ ] Ningún hueco generado es más ancho que lo que el salto máximo alcanza a la velocidad vigente.
- [ ] Caer por un hueco, chocar contra un obstáculo o contra el lateral de una azotea más alta abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final.
- [ ] El HUD del reproductor (`.player-hud`) y el HUD in-canvas (SCORE/NIVEL) muestran siempre los mismos valores, sin desincronizarse.
- [ ] La columna "Vidas" de `.player-hud` muestra siempre un único corazón durante toda la partida.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, conserva el último frame) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal "FIN DEL JUEGO" con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (azotea inicial, puntaje 0, nivel 1, velocidad base), no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "fuga-neon", score, name }`), visible recargando `/juegos/fuga-neon` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero aparece un único botón táctil "Saltar" que respeta el salto variable (mantener = salto alto); con mouse/teclado normal no aparece.
- [ ] Salir de `/juegos/fuga-neon/jugar` no deja listeners de teclado activos en `window`.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual, y los placeholders siguen con la simulación falsa.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego diseñado desde cero (no hay material en `references/started-games/` ni `references/source-assets/`), retomando la sugerencia `fuga-neon` del `game-planner`. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** fila nueva sin `delete` — ningún placeholder describe un runner; reutilizar `ranaria` (cruce de autopista) cambiaría el juego que su copy promete. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** categoría `ARCADE`, color `magenta`, `best: 12640`, `plays: "3.9K"`. Magenta es el neón dominante de la estética cyberpunk y hoy solo lo usa `tetris`. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** cover nuevo `.cover-fuga-neon` con `/frontend-design` — ninguna clase existente representa una ciudad.
- **Sí:** una sola acción (saltar) con altura variable por `JUMP_CUT`, más `COYOTE_TIME` y `JUMP_BUFFER` — con un solo botón, la profundidad del juego sale del control fino del salto. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** puntaje = metros recorridos (`distance / 10`) — es la métrica más legible para un runner y garantiza que el puntaje suba por el motor, no por temporizador. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** una sola vida con `lives` fijo en 1 y la columna "Vidas" estándar — mismo criterio que Snake (SPEC 09): no hay otro número de juego que tenga más sentido ahí, porque los metros ya son el SCORE. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** `dt` variable estándar de la plataforma con física en px/s — consistente con el resto de los motores. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** generador con `maxGap = runSpeed * AIR_TIME * 0.75` — evita el riesgo, señalado por el `game-planner`, de tramos imposibles.
- **Sí:** reutilizar `.touch-btn-fire` tal cual como botón "Saltar" de tipo "mantener" — no hace falta CSS de controles nuevo. Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar.
- **Sí:** teclado con `Space`, `ArrowUp` y `KeyW` para saltar — cubre los dos esquemas que ya usan los demás juegos.
- **Sí:** se agrega la entrada al registry existente (creado en SPEC 07), sin tocar `jugar-client.tsx`.
- **No:** deslizarse, drones, coleccionables, varias vidas — se dejan para las variantes B/C; esta variante prioriza el menor esfuerzo.
- **No:** tocar el canvas para saltar — el contrato táctil de la plataforma usa botones fijos, no gestos sobre el canvas.
- **No:** sonido, pantalla de inicio, pausa propia o récords locales — la plataforma ya los cubre y ningún juego tiene audio.

## Risks

| Riesgo                                                                                                                                      | Mitigación                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Con un solo botón y sin coleccionables, las partidas pueden sentirse repetitivas y los puntajes agruparse en valores parecidos              | La velocidad creciente, los obstáculos de dos alturas y el salto variable dan el techo de habilidad; si no alcanza, la variante B es la extensión natural sin cambiar el `game-id`.      |
| Un `dt` grande (pestaña en segundo plano, clamp a 0.05) puede hacer que los pies atraviesen un techo delgado sin detectar el aterrizaje     | La detección compara la posición de los pies del frame anterior con la del actual (barrido), no solo la posición final.                                                                  |
| Es el cuarto juego `ARCADE` del catálogo (con `arkanoid`, `snake` y los placeholders `gloton`/`ranaria`), lo que resta diversidad al filtro | Se acepta: un runner no encaja en `PUZZLE`/`SHOOTER`/`VERSUS`, y `CATS` no tiene otra categoría. Queda anotado para que el `game-planner` priorice otras categorías en el próximo juego. |
| El botón táctil de tipo "mantener" puede quedar pegado si el dedo sale del botón sin disparar `pointerup`                                   | Se escuchan también `onPointerLeave` y `onPointerCancel`, igual que los botones de "mantener" de Asteroides/Tetris/Arkanoid.                                                             |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo.
- Deslizarse, drones, barreras láser y coleccionables (variante B).
- Hackeo, distritos temáticos y torretas (variante C).
- Varias vidas o escudos.
- Sprites o imágenes externas.
- Sonido o música.
- Pantalla de inicio, pausa propia o récords en `localStorage`.
- Controles táctiles por gestos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
