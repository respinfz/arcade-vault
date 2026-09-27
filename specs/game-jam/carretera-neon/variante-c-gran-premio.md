# SPEC GJ — Juego: CARRETERA NEÓN (Variante C: Gran Premio nocturno)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-27
> **Objective:** Agregar CARRETERA NEÓN jugable al catálogo como Gran Premio vertical por etapas contra cinco rivales CPU con nombre (terminar cada etapa entre los tres primeros, con tráfico, combustible, freno y turbo por rebufo), con motor real diseñado desde cero, HUD sincronizado, consola táctil de pedales y leaderboard en `av_scores`.

## Por qué existe este spec

Este spec sale de la game jam de Arcade Vault para el juego **CARRETERA NEÓN**, sin tema adicional. Retoma la sugerencia `carretera-neon` del agente `game-planner` (`references/game-suggestions-to-do.md`, 30/35, esfuerzo M): "Road Fighter/Spy Hunter: tráfico + rivales CPU + combustible", con el riesgo anotado de que "sin IA rival propia se siente ARCADE".

No hay ninguna carpeta en `references/started-games/` ni material en `references/source-assets/` para este juego: el motor se diseña desde cero y todo se dibuja con figuras vectoriales.

**Esta variante (C) es la versión ambiciosa:** la partida deja de ser una ruta infinita y pasa a ser un campeonato. Cinco rivales CPU con nombre y personalidad corren la misma etapa que el jugador (se simulan también fuera de pantalla), hay una posición en carrera que cambia en vivo, y al cruzar la meta de cada etapa de 5000 m hay que estar entre los tres primeros para seguir. Suma freno, turbo por rebufo, combustible por etapa y tres escenarios cíclicos (el puente reduce la ruta a tres carriles). No hay vidas: chocar hace trompear el auto y cuesta posiciones. Sube el esfuerzo a L por la IA de carrera y la consola táctil de pedales nueva. La variante A es la versión mínima (esquivar y combustible) y la variante B la de combate vial infinito. Las tres comparten el mismo `game-id` (`carretera-neon`), así que son **mutuamente excluyentes**: se implementa solo una.

CARRETERA NEÓN **no reemplaza ningún placeholder**. El `game-planner` la anotó como "candidato a ocupar `duelo-pixel`", pero el copy de `duelo-pixel` describe un Pong ("dos paletas, una pelota") y ese Pong sigue siendo una sugerencia propia pendiente (DUELO PIXEL, 27/35). Es una fila nueva en `av_games`, sin `delete`.

## Scope

**In:**

- Entrada nueva `carretera-neon` en `av_games` (vía migración SQL), con `title: "CARRETERA NEÓN"`, categoría `VERSUS`, color `yellow`, cover `cover-carretera-neon`, y `best`/`plays` decorativos plausibles.
- Clase de cover art nueva `.cover-carretera-neon` en `app/globals.css`, diseñada con `/frontend-design`.
- Motor del juego en `components/games/carretera-neon/engine.ts`, diseñado desde cero, sin variables globales de `window`/`document`/canvas.
- Canvas lógico 800×600 (4:3): ruta vertical centrada (4 carriles de 100 px, o 3 carriles en el escenario "Puente") entre vallas neón, con los márgenes como arcén decorativo y paneles de HUD in-canvas.
- Conducción con velocidad manual: `↑` acelera, `↓` frena, soltar ambos desacelera suave; `←`/`→` doblan; `Espacio` activa turbo si hay cargas.
- Cinco rivales CPU persistentes durante toda la partida (`VOLTIO`, `CROMO`, `NEBLINA`, `SÍLICE`, `RÁFAGA`), cada uno con color, habilidad y una personalidad: "bloqueador", "embestidor" o "rebufero".
- Simulación de rivales en dos niveles: en pantalla con IA de carril completa (esquivar tráfico, personalidad, contacto); fuera de pantalla solo avanza su distancia con su velocidad objetivo.
- Posición en carrera (1º–6º) recalculada cada frame por distancia recorrida en la etapa, visible en `.player-hud` y en un mini-mapa de progreso in-canvas.
- Etapas de 5000 m con salida en parrilla (el jugador sale 4º) y meta: terminar 1º, 2º o 3º da bonus y pasa a la siguiente etapa; terminar 4º o peor termina la partida.
- Sub-estado `"stageComplete"` de 2.5 s con cartel in-canvas ("ETAPA N — 2º PUESTO +2000") que continúa solo, sin tecla.
- Tráfico civil más lento generado por filas que nunca bloquean todos los carriles; los rivales en pantalla también lo esquivan.
- Contacto como en combate vial: lateral = empujón; frontal/trasero, civil o valla = trompo de 1.2 s con velocidad a 0 (para jugador y rivales). Sin vidas.
- Rebufo (detrás de un auto rival, mismo carril, 40–160 px) que carga turbo (máximo 3 cargas); turbo de 1.5 s a 780 px/s.
- Combustible por etapa: se llena a 100 en cada salida, se consume según la velocidad, bidones (+15); quedarse en 0 termina la partida.
- Tres escenarios cíclicos por etapa con paleta propia de fondo: "Ciudad" (4 carriles), "Costa" (4 carriles) y "Puente" (3 carriles).
- Puntaje por metros, adelantamientos (una vez por rival por etapa), bonus de llegada por puesto y combustible restante.
- HUD in-canvas (SCORE, ETAPA, POSICIÓN, mini-mapa de 6 puntos, COMBUSTIBLE, VELOCIDAD, TURBO) sincronizado con `.player-hud`: "Vidas" pasa a "Posición" vía `hudLivesLabel` y "Nivel" muestra la etapa.
- Componente `components/games/carretera-neon/carretera-neon-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressGas(held)`, `pressBrake(held)`, `pressTurbo()`) y props de callback `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.
- Controles táctiles `components/games/carretera-neon/touch-controls.tsx` (siempre renderiza; `JugarClient` lo monta en `.touch-console` con `useCoarsePointer()`): ◀/▶ en `.touch-controls-move` y un grupo nuevo de pedales `.touch-pedals` (ACELERAR, FRENO, TURBO) con CSS nuevo diseñado con `/frontend-design`.
- Agregar la entrada `carretera-neon` al registry existente `components/games/registry.ts`, con `hudLivesLabel: "Posición"`.
- Pausa real (congela `update(dt)`, conserva el último frame) y game over real (llegar 4º o peor, o quedarse sin combustible) conectado al modal "FIN DEL JUEGO" existente.

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo no cambia su comportamiento (`asteroides`, `tetris`, `arkanoid`, `snake`, `frogger` con motor real; `gloton`, `invasores`, `duelo-pixel` con simulación falsa).
- Curvas reales de la ruta, pits o boxes, clima con cambio de agarre.
- Armas de Spy Hunter (humo, aceite, misiles).
- Tabla del campeonato entre etapas (puntos acumulados por rival) — solo se muestra la posición de la etapa.
- Selección de auto o rival, ni nombres editables.
- Skins visuales — las agrega después el agente `skin-designer`.
- Sprites o imágenes externas — todo es dibujo vectorial.
- Sonido/música — ningún juego de la plataforma lo tiene todavía.
- Pantalla de inicio propia, menú de pausa propio o récords en `localStorage`.
- Controles táctiles por gestos o por inclinación del dispositivo.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('carretera-neon', 'CARRETERA NEÓN', 'Pisa a fondo, esquiva el tráfico y no te quedes seco.', 'Un Gran Premio nocturno por autopistas de neón contra cinco pilotos que no regalan nada. Cada etapa son cinco kilómetros de tráfico, rebufos y empujones: cruza la meta entre los tres primeros o quedas fuera del campeonato. Frena a tiempo, carga el turbo detrás de tus rivales y no dejes que el tanque se vacíe antes de la bandera.', 'VERSUS', 'cover-carretera-neon', 'yellow', 48720, '5.6K');
```

No hay `delete`: CARRETERA NEÓN no reemplaza ningún placeholder. `best`/`plays` son decorativos (fallback mientras `av_scores` no tenga filas para `carretera-neon`).

```ts
// components/games/carretera-neon/engine.ts
export interface EngineInput {
  keys: Record<string, boolean>; // estado sostenido, por KeyboardEvent.code
  justPressed: Record<string, boolean>; // flanco de subida, consumido por el motor
}
export type GameState = "playing" | "stageComplete" | "gameover";

type Personality = "bloqueador" | "embestidor" | "rebufero";
type Scenery = "ciudad" | "costa" | "puente";

interface Racer {
  name: string; // "VOLTIO" | "CROMO" | "NEBLINA" | "SÍLICE" | "RÁFAGA"
  color: string; // color fijo de carrocería (nunca el --yellow del jugador)
  personality: Personality;
  skill: number; // 0.94..1.04, multiplica la velocidad objetivo
  d: number; // metros recorridos en la etapa actual
  x: number; // posición lateral (solo significativa en pantalla)
  vx: number; // velocidad lateral (IA + impulso de empujón)
  speed: number; // px/s actuales
  spin: number; // segundos de trompo restantes
  overtakenThisStage: boolean; // el jugador ya cobró el adelantamiento a este rival en esta etapa
}
interface Civil {
  x: number;
  y: number; // borde superior en pantalla
  speed: number; // 150..280 px/s
}
interface FuelCan {
  x: number;
  y: number;
  taken: boolean;
}

export class CarreteraNeonEngine {
  score = 0; // metros + adelantamientos + bonus de llegada + combustible sobrante
  lives = 4; // POSICIÓN en carrera (1..6); va a "Posición" en .player-hud vía hudLivesLabel
  level = 1; // ETAPA actual; va a "Nivel" en .player-hud
  state: GameState = "playing"; // "stageComplete" = cartel de 2.5 s entre etapas, no es fin de partida
  distance = 0; // metros del jugador en la etapa actual (0..5000)
  totalMeters = 0; // metros acumulados de toda la partida (base del puntaje)
  speed = 0; // px/s del jugador; se ve como km/h en el HUD in-canvas
  fuel = 100;
  slipstream = 0; // 0..100
  turboCharges = 0; // 0..3
  racers: Racer[] = []; // los 5 rivales

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // etapa 1 "ciudad", parrilla con el jugador 4º, score 0, combustible 100, sin turbo
  forceGameOver(): void {} // state = "gameover", sin tocar el score
  update(dt: number): void {} // dt en segundos, clampeado a 0.05 por el componente
  draw(): void {} // escenario + ruta + civiles + rivales + jugador + HUD + cartel de etapa
}
```

Geometría y constantes (px y segundos, tiempo real):

- Ruta de 4 carriles: `ROAD_X = 200`, `ROAD_W = 400`; en "puente": `ROAD_X = 250`, `ROAD_W = 300` (3 carriles). `LANE_W = 100`. Autos de 36×64 px; jugador en `PLAYER_Y = 440` fijo (más alto que en A/B para ver rivales que vienen de atrás).
- Pantalla de un rival: `y = PLAYER_Y − (racer.d − distance) × PX_PER_METER`, con `PX_PER_METER = 10`; está "en pantalla" si `y` está en `[−120, 700]`.
- Jugador: `MAX_SPEED = 600` px/s, `TURBO_SPEED = 780` px/s, `GAS_ACCEL = 350` px/s², `BRAKE_DECEL = 900` px/s², `COAST_DECEL = 150` px/s², `STEER_SPEED = 300` px/s (×0.6 por debajo de 150 px/s).
- Rivales: velocidad objetivo `RIVAL_BASE × skill × (1 + 0.05 × (etapa − 1))` con `RIVAL_BASE = 500` px/s; rubber-banding ×1.08 si van más de 80 m detrás del jugador y ×0.95 si van más de 80 m delante.
- Contacto: lateral (solape vertical ≥ 50 %) → `BUMP_IMPULSE = 240` px/s opuesto a ambos; frontal/trasero, civil o valla → `SPIN_TIME = 1.2` s con velocidad a 0 y sin control (el auto golpeado, si es rival, trompea igual).
- Rebufo: `SLIPSTREAM_RATE = 45`/s detrás de un rival en su carril (±30 px, 40–160 px delante); 100 = una carga, máximo 3. `TURBO_TIME = 1.5` s.
- Combustible: `FUEL_BURN = 0.5 + 0.7 × (speed / MAX_SPEED)` por segundo (turbo cuenta como 1.2), `FUEL_CAN = 15`, `CAN_EVERY = 700` m; se llena a 100 al empezar cada etapa.
- `STAGE_LENGTH = 5000` m, `STAGE_BANNER_TIME = 2.5` s, `QUALIFY_POSITION = 3`.
- Puntaje: `Math.floor(totalMeters)` + `OVERTAKE_POINTS = 100 × etapa` por rival adelantado (una vez por rival por etapa) + bonus de llegada `{1: 3000, 2: 2000, 3: 1000}[posición] × etapa` + `Math.floor(fuel) × 10` al cruzar la meta.
- Escenario: `["ciudad", "costa", "puente"][(etapa − 1) % 3]`.

Reglas de la IA de rivales en pantalla (`updateRacerAI(racer, dt)`):

- Todos: si hay un civil en su carril a menos de 180 px por delante, cambian a un carril libre (±80 px de alto) o igualan la velocidad del civil si no hay hueco.
- "bloqueador": si el jugador está detrás a menos de 260 px, se desplaza hacia su carril con reacción de 0.4 s (−0.04 por etapa, mínimo 0.2) a `RIVAL_STEER = 150` px/s (máximo 240), siempre menor que `STEER_SPEED`.
- "embestidor": si está al lado del jugador (solape vertical ≥ 50 %, a menos de 70 px), enciende el intermitente 0.5 s y empuja lateralmente a 300 px/s; solo si el jugador tiene hueco hacia el lado contrario.
- "rebufero": si está detrás del jugador a menos de 200 px, se pone en su carril y, al cargar rebufo propio 1.5 s, sale por el carril libre con +12 % de velocidad durante 2 s.

Reglas de parrilla y meta:

- Salida de cada etapa: tres rivales en `d = 12, 8, 4` m y dos en `d = −4, −8` m, repartidos en carriles distintos; el jugador en `d = 0` (4º) y a velocidad 0. Civiles vacíos durante los primeros 200 m.
- Al llegar el jugador a `distance >= STAGE_LENGTH`: la posición final es `1 +` la cantidad de rivales con `d` mayor o igual a la del jugador. Si es ≤ 3, suma el bonus, pasa a `"stageComplete"` y, tras `STAGE_BANNER_TIME`, `level += 1` y nueva parrilla. Si es > 3, `state = "gameover"`.
- Quedarse con `fuel <= 0` pone `state = "gameover"` en cualquier punto de la etapa.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma (`hudLivesLabel` ya existe desde SPEC 07), solo recibe la entrada nueva.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_carretera_neon.sql` con el `insert` de la fila `carretera-neon` del modelo de datos. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que `av_games` tiene la fila nueva y que `gloton`, `invasores` y `duelo-pixel` siguen intactos.
2. Agregar `.cover-carretera-neon` en `app/globals.css`, junto a las demás clases `.cover-*`, diseñada con `/frontend-design`: fondo nocturno `#07070f`, `::after` con una ruta en perspectiva hacia un arco de meta a cuadros (`repeating-conic-gradient` en `--ink`/negro), vallas `--cyan` y tres pares de luces traseras de colores distintos, y `::before` con el auto del jugador en silueta `--yellow`.
3. Crear `components/games/carretera-neon/engine.ts` con la base de conducción: clase `CarreteraNeonEngine`, constantes del modelo de datos, `updatePlayer(dt)` (acelerar con `ArrowUp`/`KeyW`, frenar con `ArrowDown`/`KeyS`, doblar con `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD`), `updateFuel(dt)`, choque contra valla con trompo, y `draw()` con escenario y asfalto desde un canvas offscreen por escenario (se redibuja solo al cambiar de etapa), líneas de carril desplazadas por `laneOffset` y el jugador. En este paso ya se conduce una etapa vacía de 5000 m que termina en `"stageComplete"` (posición 1º) y encadena etapas; el combustible en 0 termina la partida.
4. En el mismo `engine.ts`, agregar los rivales: `createRacers()` con los 5 `Racer` (nombre, color, `skill` y personalidad fijos), `placeGrid()` para la parrilla, `advanceRacer(racer, dt)` fuera de pantalla (solo `d += speed × dt / PX_PER_METER` con rubber-banding) y `computePosition()` cada frame, que actualiza `lives`. `draw()` dibuja los rivales en pantalla con su color y una etiqueta de 3 letras del nombre sobre el techo. Al entrar un rival en pantalla desde fuera, se lo ubica en el carril más libre de su borde de entrada.
5. En el mismo `engine.ts`, agregar tráfico civil (`spawnRow()` con 1–2 civiles por fila, nunca todos los carriles ocupados en una franja de 160 px, cola dentro del carril), `resolveContacts()` (lateral → empujón; frontal/trasero, civil o valla → trompo) para jugador y rivales en pantalla, y la IA de `updateRacerAI(racer, dt)` con las tres personalidades.
6. En el mismo `engine.ts`, agregar rebufo, turbo (`Space`/`KeyX` en `justPressed`), bidones, adelantamientos (`overtakenThisStage`), la meta con bonus por puesto y combustible sobrante, el cartel de `"stageComplete"`, el cambio cíclico de escenario (3 carriles en "puente", reubicando autos que queden fuera de la ruta al carril más cercano) y el HUD in-canvas: panel izquierdo con SCORE, ETAPA, POSICIÓN ("3º/6") y velocímetro en km/h (`speed × 0.36`); panel derecho con mini-mapa vertical (línea de 0 a 5000 m con 6 puntos de color, el jugador en `--yellow`), COMBUSTIBLE y tres celdas de TURBO. Sin overlay de "GAME OVER" propio: al quedar eliminado solo se congela la escena y se abre el modal de la plataforma.
7. Crear `components/games/carretera-neon/carretera-neon-game.tsx` siguiendo `asteroids-game.tsx`: constantes `WIDTH = 800`/`HEIGHT = 600` y `PREVENT_DEFAULT_CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]`, refs de último valor, canvas absoluto que llena `.crt-screen`, loop de `requestAnimationFrame` con `dt` clampeado a 0.05 (pausable con `paused`, `draw()` siempre), listeners `keydown`/`keyup` en `window` solo mientras está montado. `forwardRef` expone `restart()`, `forceGameOver()`, `pressLeft(held)`, `pressRight(held)`, `pressGas(held)` (`ArrowUp`), `pressBrake(held)` (`ArrowDown`) y `pressTurbo()` (marca `Space` en `input.justPressed`). Diffea `score`/`lives`/`level` cada frame y dispara `onGameOver(engine.score)` solo en la transición a `"gameover"` (nunca en `"stageComplete"`).
8. Crear `components/games/carretera-neon/touch-controls.tsx` (sin detección de puntero, siempre renderiza): `.touch-controls-move` con ◀ (slot 1, `aria-label="Doblar a la izquierda"`), `<div aria-hidden="true" />` en el slot 2 y ▶ (slot 3, `aria-label="Doblar a la derecha"`); y un `<div className="touch-pedals">` con `touch-btn touch-btn-gas` "▲" (`aria-label="Acelerar"`, mantener, 72×72), `touch-btn touch-btn-brake` "▼" (`aria-label="Frenar"`, mantener, 56×56) y `touch-btn touch-btn-turbo` "TURBO" (`aria-label="Activar turbo"`, tap, 56×56). Agregar en `app/globals.css`, en el bloque de la consola táctil y diseñado con `/frontend-design`, las clases `.touch-pedals` (columna 3 del grid de `.touch-controls`, pedales verticales tipo acelerador/freno con acelerador a la derecha), `.touch-btn-gas` (`--btn-rgb` verde), `.touch-btn-brake` (`--btn-rgb` magenta) y `.touch-btn-turbo` (`--btn-rgb` amarillo), y `.av-player.av-player--touch:has(.touch-pedals)` con el `--touch-console-h` que necesite el layout.
9. Agregar la entrada `"carretera-neon"` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: CarreteraNeonGame`, `TouchControls: CarreteraNeonTouchControls`, `hudLivesLabel: "Posición"`), con el mismo cast `as unknown as` que las demás entradas. `jugar-client.tsx` no cambia: ya muestra el valor plano cuando el rótulo no es `"Vidas"`.
10. Recorrer manualmente con `npm run dev`: la tarjeta aparece en Inicio y Biblioteca con su cover; en `/juegos/carretera-neon/jugar` el jugador sale 4º desde parado; `↑` acelera, `↓` frena, `←`/`→` doblan; la posición cambia en `.player-hud` al adelantar o ser adelantado; cada rival se comporta según su personalidad; el rebufo carga turbo y `Espacio` lo usa; chocar hace trompear y perder posiciones; al cruzar 5000 m entre los tres primeros aparece el cartel de etapa y empieza la siguiente con otro escenario (la etapa 3 es el puente de 3 carriles); llegar 4º o quedarse sin combustible abre "FIN DEL JUEGO"; "PAUSA"/"REANUDAR"/"FIN"/"JUGAR DE NUEVO" funcionan como en Arkanoid; guardar la puntuación la agrega a `av_scores`; con emulación táctil (360×640 y 390×844 vertical) aparece la consola con ◀/▶ y los tres pedales bajo la pantalla, sin tapar el canvas ni desbordar la altura visible. Confirmar que los demás juegos (incluidas sus consolas táctiles) siguen igual y que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` tiene una fila `id: "carretera-neon"` con `title: "CARRETERA NEÓN"` y `cat: "VERSUS"`, y los placeholders `gloton`, `invasores` y `duelo-pixel` siguen existiendo.
- [ ] La tarjeta "CARRETERA NEÓN" aparece en `/` y `/biblioteca` con su cover propio (`cover-carretera-neon`), sin clase CSS faltante, y aparece al filtrar por `VERSUS`.
- [ ] `/juegos/carretera-neon` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `carretera-neon`.
- [ ] En `/juegos/carretera-neon/jugar` la partida empieza parada en parrilla, con el jugador 4º, tres rivales delante y dos detrás.
- [ ] `↑`/`W` acelera hasta la velocidad máxima, `↓`/`S` frena visiblemente más rápido de lo que desacelera soltando ambas teclas, y `←`/`A`, `→`/`D` doblan.
- [ ] El puntaje sube por metros recorridos y eventos del motor real, no por temporizador, y no sube mientras el juego está en pausa ni durante el cartel de etapa.
- [ ] La posición (1–6) de `.player-hud`, rotulada "Posición" (no "Vidas"), y la del HUD in-canvas coinciden siempre y cambian al adelantar o ser adelantado.
- [ ] Adelantar a un rival suma `100 × etapa` puntos una sola vez por rival por etapa, aunque se lo vuelva a adelantar.
- [ ] Los rivales en pantalla esquivan el tráfico civil y cada personalidad es reconocible: el bloqueador se cruza delante, el embestidor avisa con intermitente antes de empujar, el rebufero se pega detrás y sale con un tirón.
- [ ] Los rivales fuera de pantalla siguen avanzando: tras quedarse parado unos segundos, el mini-mapa muestra que los rivales de atrás lo alcanzan y la posición empeora.
- [ ] Un contacto lateral empuja a ambos autos sin trompo; un contacto frontal/trasero, con un civil o con la valla hace trompear 1.2 s al auto afectado con la velocidad a 0.
- [ ] Mantenerse detrás de un rival en su carril carga la barra de rebufo; cada barra completa suma una carga de turbo (máximo 3) y `Espacio`/`X` la usa durante 1.5 s.
- [ ] Recoger un bidón suma 15 de combustible (sin pasar de 100); el combustible vuelve a 100 al empezar cada etapa.
- [ ] Cruzar los 5000 m en 1º, 2º o 3º muestra el cartel "ETAPA N — Xº PUESTO +bonus" durante 2.5 s, suma el bonus por puesto y el combustible sobrante, y arranca la etapa siguiente sin presionar ninguna tecla.
- [ ] "Nivel" de `.player-hud` muestra la etapa actual y coincide con ETAPA del HUD in-canvas.
- [ ] Las etapas alternan los escenarios "Ciudad", "Costa" y "Puente"; en "Puente" la ruta tiene 3 carriles y ningún auto queda fuera de ella.
- [ ] Cruzar la meta 4º o peor, o quedarse sin combustible, abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final; el cartel de etapa no lo abre.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, conserva el último frame, no avanzan rivales fuera de pantalla ni el cartel de etapa) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal "FIN DEL JUEGO" con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (etapa 1 "Ciudad", parrilla con el jugador 4º, puntaje 0, combustible 100, sin turbo), no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "carretera-neon", score, name }`), visible recargando `/juegos/carretera-neon` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `(pointer: coarse)` aparece la consola táctil bajo la pantalla con ◀/▶ (mantener) y los pedales ACELERAR (mantener, ≥ 64 px), FRENO (mantener, ≥ 56 px) y TURBO (tap, ≥ 56 px), y controlan el auto; con mouse/teclado normal no aparece.
- [ ] A 360×640 y 390×844 en vertical, la pantalla CRT, el HUD y la consola de pedales entran juntos en la altura visible sin scroll.
- [ ] Salir de `/juegos/carretera-neon/jugar` no deja listeners de teclado activos en `window`.
- [ ] El resto de los juegos del catálogo siguen exactamente igual (los de motor real vía el registry, con sus consolas táctiles sin cambios, y los placeholders con la simulación falsa).
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego diseñado desde cero (no hay material en `references/started-games/` ni `references/source-assets/`), retomando la sugerencia `carretera-neon` del `game-planner`. El juego lo eligió el usuario.
- **Sí:** fila nueva sin `delete` en vez de ocupar `duelo-pixel` — el copy de `duelo-pixel` promete un Pong y el `game-planner` mantiene DUELO PIXEL como sugerencia propia pendiente. Decidido por el agente game-jam — revisar.
- **Sí:** categoría `VERSUS`, color `yellow`, `best: 48720`, `plays: "5.6K"` — una carrera por posiciones contra rivales con nombre es el caso más claro de `VERSUS` sin segundo jugador; `yellow` hoy solo lo usa `gloton`. Decidido por el agente game-jam — revisar.
- **Sí:** cover nuevo `.cover-carretera-neon` con `/frontend-design` — ninguna clase existente representa una ruta.
- **Sí:** cinco rivales persistentes con nombre y personalidad, simulados también fuera de pantalla — sin esto la "posición" no tendría sentido y los rivales serían tráfico con otro color. Decidido por el agente game-jam — revisar.
- **Sí:** clasificar entre los tres primeros por etapa como condición de derrota, sin vidas — reemplaza la vida por un objetivo competitivo legible; chocar castiga con posiciones perdidas en vez de con un contador. Decidido por el agente game-jam — revisar.
- **Sí:** la columna "Vidas" pasa a "Posición" vía `hudLivesLabel` y "Nivel" muestra la etapa — la posición es el dato que más cambia y el que decide la partida. Decidido por el agente game-jam — revisar.
- **Sí:** rubber-banding moderado (×1.08 / ×0.95 fuera de ±80 m) — mantiene al pelotón cerca para que haya duelos en pantalla; con valores mayores se sentiría injusto. Decidido por el agente game-jam — revisar.
- **Sí:** freno manual y aceleración sostenida en vez de crucero automático — una carrera por posiciones necesita modular la velocidad (frenar detrás de un bloqueador, soltar para no chocar un civil). Decidido por el agente game-jam — revisar.
- **Sí:** combustible por etapa con recarga en cada salida — mantiene el recurso de Road Fighter sin que una mala etapa arrastre a las siguientes. Decidido por el agente game-jam — revisar.
- **Sí:** puntaje = metros + `100 × etapa` por adelantamiento (una vez por rival por etapa) + bonus por puesto `× etapa` + combustible × 10 — escala con la etapa alcanzada y evita "farmear" adelantamientos dejándose pasar. Decidido por el agente game-jam — revisar.
- **Sí:** sub-estado `"stageComplete"` que continúa solo tras 2.5 s — es una transición, no un fin de partida (mismo criterio que `"levelComplete"` de Arkanoid), y no exige tecla para no romper el flujo táctil. Decidido por el agente game-jam — revisar.
- **Sí:** escenarios cíclicos con un puente de 3 carriles — da variedad por etapa y cambia la táctica (menos espacio para adelantar) con un solo parámetro de ruta. Decidido por el agente game-jam — revisar.
- **Sí:** consola táctil nueva `.touch-pedals` (acelerador, freno, turbo) con CSS nuevo diseñado con `/frontend-design` — ningún layout existente tiene dos acciones sostenidas más un tap en el lado derecho. Decidido por el agente game-jam — revisar.
- **Sí:** teclado con flechas y `W`/`A`/`S`/`D`; turbo en `Espacio` o `X`.
- **Sí:** `dt` variable estándar con velocidades en px/s — consistente con el resto de los motores.
- **Sí:** se agrega la entrada al registry existente (creado en SPEC 07), sin tocar `jugar-client.tsx`.
- **No:** curvas reales, pits, clima y armas — cada uno es un sistema grande por sí solo; esta variante ya es la de mayor esfuerzo.
- **No:** tabla de campeonato acumulada entre etapas — la posición de etapa ya da el objetivo; la tabla sería UI extra sin efecto en el puntaje.
- **No:** sonido, pantalla de inicio, pausa propia o récords locales — la plataforma ya los cubre.

## Risks

| Riesgo                                                                                                                                                   | Mitigación                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La transición de un rival entre simulación fuera de pantalla y en pantalla puede hacerlo aparecer encima de un civil o del jugador                      | Al entrar en pantalla se ubica en el carril más libre de su borde de entrada; si no hay ninguno, espera fuera de pantalla igualando la velocidad del jugador hasta que se libere.                                                 |
| El rubber-banding puede sentirse como "trampa" si un rival alcanza al jugador tras una etapa perfecta                                                    | Solo actúa fuera de ±80 m y con ±8 % máximo; los rivales nunca superan `MAX_SPEED` sin turbo propio. Los valores son constantes ajustables tras el recorrido manual.                                                               |
| La posición puede "parpadear" entre dos valores cuando dos autos van a la misma distancia, disparando `onLivesChange` muchas veces por segundo           | `computePosition()` aplica una histéresis de 2 m: un rival solo cambia de lado respecto al jugador cuando la diferencia supera ese margen.                                                                                         |
| Terminar 4º por un choque en los últimos metros puede sentirse injusto como fin de partida                                                               | El mini-mapa muestra siempre la distancia a la meta y los puntos de los rivales, y los últimos 300 m no generan civiles nuevos.                                                                                                   |
| La consola de pedales es CSS nuevo y puede desbordar la altura visible en 360×640 o chocar con el grid de `.touch-controls`                               | Se diseña con `/frontend-design` dentro de la columna 3 existente, con `--touch-console-h` propio vía `:has(.touch-pedals)`, y se verifica en los dos tamaños del paso 10; si hace falta, se puede pasar por `mobile-porter`.      |
| El motor es el más grande de la plataforma (IA en dos niveles, contacto, etapas, escenarios) y puede bajar los FPS en móvil (anti-patrón de SPEC 13)    | Offscreen por escenario redibujado solo al cambiar de etapa, halos pre-renderizados, sin `shadowBlur` por entidad, arrays reutilizados; se puede pasar después por `game-performance-booster`.                                    |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo.
- Curvas reales, pits, clima y armas.
- Tabla de campeonato acumulada entre etapas.
- Selección de auto o rival y nombres editables.
- Skins visuales.
- Sprites o imágenes externas.
- Sonido o música.
- Pantalla de inicio, pausa propia o récords en `localStorage`.
- Controles táctiles por gestos o inclinación.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
