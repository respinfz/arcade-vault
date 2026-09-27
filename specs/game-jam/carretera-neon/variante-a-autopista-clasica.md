# SPEC GJ — Juego: CARRETERA NEÓN (Variante A: Autopista clásica)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-27
> **Objective:** Agregar CARRETERA NEÓN jugable al catálogo como carrera vertical infinita al estilo Road Fighter (esquivar tráfico, adelantar rivales CPU que te cierran el paso, cazar bidones de combustible), con motor real diseñado desde cero, HUD sincronizado, controles táctiles y leaderboard en `av_scores`.

## Por qué existe este spec

Este spec sale de la game jam de Arcade Vault para el juego **CARRETERA NEÓN**, sin tema adicional. Retoma la sugerencia `carretera-neon` del agente `game-planner` (`references/game-suggestions-to-do.md`, 30/35, esfuerzo M): "Road Fighter/Spy Hunter: tráfico + rivales CPU + combustible", señalada como la mejor candidata del eje `VERSUS`.

No hay ninguna carpeta en `references/started-games/` ni material en `references/source-assets/` para este juego: el motor se diseña desde cero y todo se dibuja con figuras vectoriales.

**Esta variante (A) es la versión fiel y mínima:** el auto avanza solo a velocidad de crucero, el jugador solo dobla y decide cuándo ir "a fondo", y el único recurso es el combustible. Chocar no mata: cuesta combustible, y quedarse sin combustible termina la partida (como en Road Fighter). Los rivales CPU tienen una sola conducta (cerrar el paso cuando vas detrás). La variante B agrega embestidas, vallas letales, rebufo con turbo y tres vidas; la variante C convierte la partida en un Gran Premio por posiciones con etapas. Las tres comparten el mismo `game-id` (`carretera-neon`), así que son **mutuamente excluyentes**: se implementa solo una.

CARRETERA NEÓN **no reemplaza ningún placeholder**. El `game-planner` la anotó como "candidato a ocupar `duelo-pixel`", pero el copy de `duelo-pixel` describe un Pong ("dos paletas, una pelota") y ese Pong sigue siendo una sugerencia propia pendiente (DUELO PIXEL, 27/35). Es una fila nueva en `av_games`, sin `delete`.

## Scope

**In:**

- Entrada nueva `carretera-neon` en `av_games` (vía migración SQL), con `title: "CARRETERA NEÓN"`, categoría `VERSUS`, color `yellow`, cover `cover-carretera-neon`, y `best`/`plays` decorativos plausibles.
- Clase de cover art nueva `.cover-carretera-neon` en `app/globals.css`, diseñada con `/frontend-design`.
- Motor del juego en `components/games/carretera-neon/engine.ts`, diseñado desde cero, sin variables globales de `window`/`document`/canvas.
- Canvas lógico 800×600 (4:3): ruta vertical de 4 carriles centrada (400 px de ancho), con los márgenes laterales como arcén decorativo y paneles de HUD in-canvas.
- Auto del jugador con dirección continua (`←`/`→`) y dos velocidades: crucero automático y "a fondo" mientras se mantiene `↑`.
- Tráfico civil que circula más lento que el jugador, generado por filas que nunca bloquean los 4 carriles a la vez.
- Rivales CPU (autos magenta) con una única conducta "bloqueador": cuando el jugador va detrás a menos de 260 px, se desplazan hacia su carril con reacción retardada y velocidad lateral menor que la del jugador.
- Combustible 0–100 que se consume con el tiempo (más rápido "a fondo"), bidones recogibles (+25) y repostaje de +20 al subir de nivel.
- Choque contra cualquier auto: −12 de combustible, trompo de 1 s sin control y 1.5 s de invulnerabilidad parpadeante.
- Puntaje por metros recorridos, adelantamientos a rivales y bidones recogidos.
- Nivel cada 3000 m: más tráfico, más proporción de rivales y rivales que reaccionan más rápido.
- HUD in-canvas (SCORE, METROS, NIVEL, medidor de COMBUSTIBLE) sincronizado con `.player-hud`, donde la columna "Vidas" pasa a llamarse "Combustible" vía `hudLivesLabel`.
- Componente `components/games/carretera-neon/carretera-neon-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressThrottle(held)`) y props de callback `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.
- Controles táctiles `components/games/carretera-neon/touch-controls.tsx` (siempre renderiza sus botones; `JugarClient` decide montarlo en `.touch-console` bajo la pantalla con `useCoarsePointer()`), reutilizando `.touch-controls-move` (◀/▶) y `.touch-btn-fire` ("A FONDO"), sin CSS nuevo.
- Agregar la entrada `carretera-neon` al registry existente `components/games/registry.ts`, con `hudLivesLabel: "Combustible"`.
- Pausa real (congela `update(dt)`, conserva el último frame) y game over real (combustible en 0) conectado al modal "FIN DEL JUEGO" existente.

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo no cambia su comportamiento (`asteroides`, `tetris`, `arkanoid`, `snake`, `frogger` con motor real; `gloton`, `invasores`, `duelo-pixel` con simulación falsa).
- Embestidas laterales, vallas letales, rivales "embestidores", rebufo y turbo — son el núcleo de la variante B.
- Carrera por posiciones, etapas con meta, freno y escenarios cíclicos — son el núcleo de la variante C.
- Tres vidas — en esta variante el combustible es el único recurso.
- Skins visuales — las agrega después el agente `skin-designer` en su propio cambio.
- Sprites o imágenes externas — todo es dibujo vectorial.
- Sonido/música — ningún juego de la plataforma lo tiene todavía.
- Pantalla de inicio propia, menú de pausa propio o récords en `localStorage` — la plataforma ya los cubre.
- Controles táctiles por gestos o por inclinación del dispositivo — son botones fijos.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('carretera-neon', 'CARRETERA NEÓN', 'Pisa a fondo, esquiva el tráfico y no te quedes seco.', 'Una autopista nocturna de cuatro carriles, luces de neón y un tanque que se vacía sin piedad. Esquiva el tráfico, adelanta a los rivales que intentan cerrarte el paso y caza bidones antes de quedarte sin combustible. Cada choque te cuesta nafta; ir a fondo suma metros más rápido, pero bebe el doble.', 'VERSUS', 'cover-carretera-neon', 'yellow', 48720, '5.6K');
```

No hay `delete`: CARRETERA NEÓN no reemplaza ningún placeholder. `best`/`plays` son decorativos (fallback mientras `av_scores` no tenga filas para `carretera-neon`), elegidos en el rango de los demás juegos del catálogo.

```ts
// components/games/carretera-neon/engine.ts
export interface EngineInput {
  keys: Record<string, boolean>; // estado sostenido, por KeyboardEvent.code
  justPressed: Record<string, boolean>; // flanco de subida, consumido por el motor
}
export type GameState = "playing" | "gameover";

type CarKind = "civil" | "rival";
interface Car {
  kind: CarKind;
  x: number; // borde izquierdo en pantalla, dentro de la ruta
  y: number; // borde superior en pantalla (crece hacia abajo)
  speed: number; // velocidad propia en px/s (hacia arriba del mundo)
  targetX: number; // solo rival: x hacia la que se desplaza
  reaction: number; // solo rival: segundos que faltan para reaccionar
  passed: boolean; // true cuando ya quedó detrás del jugador (adelantamiento contado)
}
interface FuelCan {
  x: number;
  y: number;
  taken: boolean;
}

export class CarreteraNeonEngine {
  score = 0; // Math.floor(distance) + overtakes * 100 + cans * 50
  lives = 100; // combustible entero (Math.ceil(fuel)); va a "Combustible" en .player-hud vía hudLivesLabel
  level = 1; // 1 + Math.floor(distance / 3000); va a "Nivel" en .player-hud
  state: GameState = "playing";
  distance = 0; // metros recorridos; se ve en el HUD in-canvas (METROS)
  fuel = 100; // valor continuo; `lives` es su techo entero

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // auto en carril 2, combustible 100, score 0, nivel 1, sin autos en pantalla
  forceGameOver(): void {} // state = "gameover", sin tocar el score
  update(dt: number): void {} // dt en segundos, clampeado a 0.05 por el componente
  draw(): void {} // arcén + ruta + autos + bidones + jugador + HUD (SCORE/METROS/NIVEL/COMBUSTIBLE)
}
```

Geometría y constantes (px y segundos, tiempo real):

- `ROAD_X = 200`, `ROAD_W = 400`, `LANES = 4`, `LANE_W = 100`; centros de carril en x = 250, 350, 450, 550.
- Autos de 36×64 px. Jugador en `PLAYER_Y = 470` fijo; su `x` se limita a `[ROAD_X + 4, ROAD_X + ROAD_W - 40]` (en esta variante tocar el borde no choca).
- `STEER_SPEED = 320` px/s, `CRUISE_SPEED = 360` px/s, `BOOST_SPEED = 560` px/s, aceleración/frenado hacia la velocidad objetivo a 400 px/s².
- `PX_PER_METER = 10`: `distance += speed * dt / 10`.
- Los autos se mueven en pantalla a `(playerSpeed - car.speed) * dt` hacia abajo; civiles entre 180 y 300 px/s; rivales entre 300 y 420 px/s (algunos más rápidos que el crucero aparecen desde abajo y te pasan).
- `RIVAL_TRIGGER = 260` px, `RIVAL_REACTION = 0.4` s (−0.04 por nivel, mínimo 0.2), `RIVAL_STEER = 140` px/s (+15 por nivel, máximo 230, siempre menor que `STEER_SPEED`).
- `FUEL_MAX = 100`, `FUEL_BURN_CRUISE = 1.5`/s, `FUEL_BURN_BOOST = 2.5`/s, `FUEL_CAN = 25`, `FUEL_LEVEL_UP = 20`, `CRASH_FUEL = 12`.
- `SPIN_TIME = 1.0` s (sin control, velocidad a 120 px/s), `INVULNERABLE_TIME = 1.5` s.
- `OVERTAKE_POINTS = 100`, `CAN_POINTS = 50`, `METERS_PER_LEVEL = 3000`, `CAN_EVERY = 700` m.

Reglas del generador (`spawnRow`):

- Cada `ROW_EVERY` metros (arranca en 90 m, ×0.88 por nivel, mínimo 45 m) se genera una fila en `y = -80` con 1 o 2 autos en carriles distintos; nunca se ocupan más de 3 carriles en una franja de 160 px de alto.
- Un auto es rival con probabilidad `0.15 + 0.05 × (level − 1)`, máximo 0.45; el resto son civiles.
- Un civil que alcanza a otro en su mismo carril iguala su velocidad (no se superponen).
- Un rival solo cambia de carril si el hueco destino está libre en ±80 px de alto.
- Cada `CAN_EVERY` metros aparece un bidón en un carril libre de esa fila.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma (`GameHandle`/`GameRegistryEntry` con `hudLivesLabel` desde SPEC 07), solo recibe la entrada nueva.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_carretera_neon.sql` con el `insert` de la fila `carretera-neon` del modelo de datos. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que `av_games` tiene la fila nueva y que `gloton`, `invasores` y `duelo-pixel` siguen intactos.
2. Agregar `.cover-carretera-neon` en `app/globals.css`, junto a las demás clases `.cover-*`, diseñada con `/frontend-design`: fondo nocturno `#07070f`, `::after` con una ruta en perspectiva (dos bordes `--cyan` convergentes y líneas de carril discontinuas `--yellow` con `repeating-linear-gradient`) y dos pares de luces traseras `--magenta` (rivales), y `::before` con un auto del jugador en silueta `--yellow`.
3. Crear `components/games/carretera-neon/engine.ts` con la base de conducción: clase `CarreteraNeonEngine`, constantes del modelo de datos, métodos privados `updatePlayer(dt)` (dirección con `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD`, "a fondo" con `ArrowUp`/`KeyW`/`Space`, velocidad objetivo `CRUISE_SPEED` o `BOOST_SPEED`), `updateFuel(dt)` y `updateLevel()`. `draw()` pinta el arcén (dos franjas oscuras con postes neón que bajan a la velocidad del jugador), la ruta con líneas de carril discontinuas desplazadas por un `laneOffset` y el auto del jugador. El fondo estático (arcén y asfalto) se dibuja una sola vez en un canvas offscreen y se copia con `drawImage` cada frame (receta de SPEC 13). En este paso el juego ya corre y termina al vaciarse el combustible.
4. En el mismo `engine.ts`, agregar tráfico y rivales: array `cars: Car[]`, método privado `spawnRow()` con las reglas del generador, `updateCars(dt)` (movimiento relativo, cola dentro del carril, conducta "bloqueador" de los rivales con `reaction`/`targetX`) y `checkCollisions()` (AABB con 4 px de tolerancia). Un choque aplica `CRASH_FUEL`, `SPIN_TIME` e `INVULNERABLE_TIME`, y empuja al auto chocado 40 px hacia arriba para que no vuelva a tocar. Un rival que queda por debajo de `PLAYER_Y + 64` sin choque durante la maniobra marca `passed = true` y suma `OVERTAKE_POINTS`. Los autos que salen por abajo (`y > 680`) o por arriba (`y < -200`) se eliminan.
5. En el mismo `engine.ts`, agregar bidones (`cans: FuelCan[]`, recogida por AABB, `FUEL_CAN` + `CAN_POINTS`) y el HUD in-canvas: panel izquierdo (x 0–200) con SCORE, METROS y NIVEL; panel derecho (x 600–800) con un medidor vertical de COMBUSTIBLE que cambia de `--green` a `--yellow` bajo 40 y a `--magenta` parpadeante bajo 20, y el número entero `lives`. Al subir de nivel, cartel "NIVEL N" de 1.2 s sobre la ruta sin detener el juego. Sin overlay de "GAME OVER" propio. Sin `shadowBlur` por entidad: el brillo de faros y luces se hace con un halo pre-renderizado en offscreen.
6. Crear `components/games/carretera-neon/carretera-neon-game.tsx` siguiendo `asteroids-game.tsx`: constantes `WIDTH = 800`/`HEIGHT = 600` y `PREVENT_DEFAULT_CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]`, refs de último valor, canvas absoluto que llena `.crt-screen`, loop de `requestAnimationFrame` con `dt` clampeado a 0.05 (pausable con `paused`, `draw()` siempre), listeners `keydown`/`keyup` en `window` solo mientras está montado. `forwardRef` expone `restart()`, `forceGameOver()`, `pressLeft(held)` (escribe `ArrowLeft` en `input.keys`), `pressRight(held)` (`ArrowRight`) y `pressThrottle(held)` (`ArrowUp`). Diffea `score`/`lives`/`level` cada frame y dispara `onGameOver(engine.score)` en la transición a `"gameover"`.
7. Crear `components/games/carretera-neon/touch-controls.tsx` (sin detección de puntero, siempre renderiza): `<div className="touch-controls">` con `<div className="touch-controls-move">` que contiene ◀ (`aria-label="Doblar a la izquierda"`, slot `:nth-child(1)`), un `<span aria-hidden>` vacío en el slot 2 y ▶ (`aria-label="Doblar a la derecha"`, slot 3), más `<button className="touch-btn touch-btn-fire">` con "A FONDO" (`aria-label="Acelerar a fondo"`). Los tres son de tipo "mantener" (`onPointerDown` → `true`, `onPointerUp`/`onPointerLeave`/`onPointerCancel` → `false`). No se agrega CSS nuevo.
8. Agregar la entrada `"carretera-neon"` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: CarreteraNeonGame`, `TouchControls: CarreteraNeonTouchControls`, `hudLivesLabel: "Combustible"`), con el mismo cast `as unknown as` que las demás entradas. `jugar-client.tsx` no cambia: ya muestra el valor plano cuando el rótulo no es `"Vidas"`.
9. Recorrer manualmente con `npm run dev`: la tarjeta aparece en Inicio y Biblioteca con su cover; en `/juegos/carretera-neon/jugar` el auto avanza solo, `←`/`→` doblan, `↑` acelera a fondo y el medidor baja más rápido; los rivales magenta se cruzan delante cuando los sigues; adelantar uno suma 100; un choque hace girar el auto y resta 12 de combustible; los bidones suman 25; cada 3000 m sube el nivel y el tanque recibe +20; con el tanque en 0 se abre "FIN DEL JUEGO"; "PAUSA"/"REANUDAR"/"FIN"/"JUGAR DE NUEVO" funcionan como en Arkanoid; guardar la puntuación la agrega a `av_scores`; con emulación táctil (360×640 y 390×844 vertical) aparece la consola con ◀/▶/A FONDO bajo la pantalla. Confirmar que los demás juegos siguen igual y que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` tiene una fila `id: "carretera-neon"` con `title: "CARRETERA NEÓN"` y `cat: "VERSUS"`, y los placeholders `gloton`, `invasores` y `duelo-pixel` siguen existiendo.
- [ ] La tarjeta "CARRETERA NEÓN" aparece en `/` y `/biblioteca` con su cover propio (`cover-carretera-neon`), sin clase CSS faltante, y aparece al filtrar por `VERSUS`.
- [ ] `/juegos/carretera-neon` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `carretera-neon`.
- [ ] En `/juegos/carretera-neon/jugar` el auto avanza solo desde el primer frame a velocidad de crucero, con la ruta vacía durante los primeros 150 m.
- [ ] `←`/`A` y `→`/`D` desplazan el auto lateralmente mientras se mantienen, sin salir de la ruta.
- [ ] Mantener `↑`, `W` o `Espacio` sube la velocidad visible del scroll, los metros suben más rápido y el combustible baja más rápido que en crucero.
- [ ] El puntaje sube por metros recorridos (motor real), no por temporizador, y no sube mientras el juego está en pausa.
- [ ] Ninguna fila de tráfico bloquea los 4 carriles a la vez.
- [ ] Cuando el jugador sigue a un rival a menos de 260 px, el rival se desplaza hacia su carril tras una demora visible, siempre más lento que la dirección del jugador.
- [ ] Dejar atrás a un rival sin chocarlo suma exactamente 100 puntos, una sola vez por rival.
- [ ] Chocar contra cualquier auto resta 12 de combustible, hace girar al jugador 1 s sin control y lo deja parpadeando e inmune durante 1.5 s.
- [ ] Recoger un bidón suma 25 de combustible (sin pasar de 100) y 50 puntos.
- [ ] Cada 3000 m sube el nivel (visible en `.player-hud` y en el HUD in-canvas), el tanque recibe +20 y aparecen más autos y más rivales.
- [ ] La columna de `.player-hud` se rotula "Combustible" (no "Vidas") y muestra el mismo número entero que el medidor in-canvas, sin desincronizarse.
- [ ] El HUD del reproductor y el HUD in-canvas muestran siempre el mismo puntaje y nivel.
- [ ] Al llegar el combustible a 0 se abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, conserva el último frame, el combustible no baja) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal "FIN DEL JUEGO" con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (combustible 100, puntaje 0, nivel 1, 0 m, ruta vacía), no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "carretera-neon", score, name }`), visible recargando `/juegos/carretera-neon` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `(pointer: coarse)` aparece la consola táctil bajo la pantalla con ◀/▶ y "A FONDO" (los tres de mantener, ≥ 56 px y ≥ 64 px el de acción) y controlan el auto; con mouse/teclado normal no aparece.
- [ ] Salir de `/juegos/carretera-neon/jugar` no deja listeners de teclado activos en `window`.
- [ ] El resto de los juegos del catálogo siguen exactamente igual (los de motor real vía el registry y los placeholders con la simulación falsa).
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego diseñado desde cero (no hay material en `references/started-games/` ni `references/source-assets/`), retomando la sugerencia `carretera-neon` del `game-planner`. El juego lo eligió el usuario.
- **Sí:** fila nueva sin `delete` en vez de ocupar `duelo-pixel` — el copy de `duelo-pixel` promete un Pong y el `game-planner` mantiene DUELO PIXEL como sugerencia propia pendiente. Decidido por el agente game-jam — revisar.
- **Sí:** categoría `VERSUS` — los rivales CPU que te cierran el paso son el eje de la partida, y `CATS` no tiene "CARRERAS". Decidido por el agente game-jam — revisar.
- **Sí:** color `yellow` (línea central, faros) y `best: 48720`, `plays: "5.6K"` — `yellow` hoy solo lo usa `gloton`. Decidido por el agente game-jam — revisar.
- **Sí:** cover nuevo `.cover-carretera-neon` con `/frontend-design` — ninguna clase existente representa una ruta.
- **Sí:** crucero automático + "a fondo" sostenido, sin freno — es el control más barato que conserva la decisión de riesgo (más metros por segundo contra más consumo). Decidido por el agente game-jam — revisar.
- **Sí:** el combustible es el único recurso y va a la columna "Vidas" rotulada "Combustible" vía `hudLivesLabel` — es exactamente lo que decide el fin de partida en Road Fighter, y mostrar corazones sería un dato inventado. Decidido por el agente game-jam — revisar.
- **Sí:** chocar cuesta combustible y un trompo, pero no mata — mantiene una sola condición de derrota fácil de leer. Decidido por el agente game-jam — revisar.
- **Sí:** tocar el borde de la ruta no choca (el auto se limita) — reduce frustración en táctil; las vallas letales quedan para la variante B. Decidido por el agente game-jam — revisar.
- **Sí:** rivales con una sola conducta "bloqueador" con reacción retardada — es la IA mínima que hace que el juego se sienta `VERSUS` y no solo esquivar tráfico, que era el riesgo anotado por el `game-planner`. Decidido por el agente game-jam — revisar.
- **Sí:** puntaje = metros + 100 por adelantamiento + 50 por bidón — premia ir a fondo y buscar rivales en vez de esquivarlos. Decidido por el agente game-jam — revisar.
- **Sí:** canvas lógico 800×600 con ruta vertical centrada de 400 px y HUD en los márgenes — respeta el 4:3 de `.crt-screen` sin letterbox, mismo criterio que Tetris/Arkanoid.
- **Sí:** `dt` variable estándar con velocidades en px/s — consistente con el resto de los motores.
- **Sí:** táctil con `.touch-controls-move` (slots 1 y 3) y `.touch-btn-fire` como "A FONDO" de mantener — mismo layout que Arkanoid, sin CSS nuevo. Decidido por el agente game-jam — revisar.
- **Sí:** teclado con flechas y `A`/`D`/`W`, más `Espacio` como alias de "a fondo".
- **Sí:** se agrega la entrada al registry existente (creado en SPEC 07), sin tocar `jugar-client.tsx`.
- **No:** vidas, turbo, embestidas y etapas — son las variantes B y C.
- **No:** sonido, pantalla de inicio, pausa propia o récords locales — la plataforma ya los cubre.

## Risks

| Riesgo                                                                                                                                    | Mitigación                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un rival "bloqueador" puede encerrar al jugador contra un civil en el carril vecino y forzar un choque inevitable                         | `RIVAL_STEER` siempre es menor que `STEER_SPEED`, el rival solo cambia de carril si el hueco destino está libre, y nunca se ocupan más de 3 carriles en una franja de 160 px.                |
| `lives` cambia de valor casi cada segundo (combustible), lo que dispara `onLivesChange` y re-renderiza `.player-hud` a menudo             | El motor expone el techo entero del combustible y el componente solo llama al callback cuando el entero cambia (≈ 2 veces por segundo como máximo).                                         |
| Muchos autos con faros y brillo neón pueden bajar los FPS en móvil (el anti-patrón de SPEC 13)                                            | Fondo estático en offscreen, halo de faros pre-renderizado y sin `shadowBlur` por entidad desde el primer commit; se puede pasar después por `game-performance-booster`.                    |
| La partida puede alargarse indefinidamente si los bidones aparecen muy seguido                                                            | En crucero el tanque dura ≈ 67 s y un bidón cada 700 m aporta 25 (≈ 19 s de crucero), así que el balance es negativo salvo que el jugador los cace todos; ajustable con `CAN_EVERY`.        |
| Sin vidas ni metas, el juego puede sentirse `ARCADE` y no `VERSUS`, el riesgo que anotó el `game-planner`                                 | Los rivales dan la mayor fuente de puntos por maniobra (100 por adelantamiento) y aumentan con el nivel; si no alcanza, la variante B o C son la alternativa.                                |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo.
- Embestidas, vallas letales, rivales embestidores, rebufo y turbo (variante B).
- Carrera por posiciones, etapas, freno y escenarios cíclicos (variante C).
- Vidas.
- Skins visuales.
- Sprites o imágenes externas.
- Sonido o música.
- Pantalla de inicio, pausa propia o récords en `localStorage`.
- Controles táctiles por gestos o inclinación.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
