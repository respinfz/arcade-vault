# SPEC GJ — Juego: CARRETERA NEÓN (Variante B: Embestidas y rebufo)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-27
> **Objective:** Agregar CARRETERA NEÓN jugable al catálogo como carrera vertical infinita de combate vial (tráfico, rivales CPU que bloquean y embisten, vallas letales, rebufo que carga turbo, combustible y tres vidas), con motor real diseñado desde cero, HUD sincronizado, controles táctiles y leaderboard en `av_scores`.

## Por qué existe este spec

Este spec sale de la game jam de Arcade Vault para el juego **CARRETERA NEÓN**, sin tema adicional. Retoma la sugerencia `carretera-neon` del agente `game-planner` (`references/game-suggestions-to-do.md`, 30/35, esfuerzo M): "Road Fighter/Spy Hunter: tráfico + rivales CPU + combustible", con el riesgo anotado de que "sin IA rival propia se siente ARCADE".

No hay ninguna carpeta en `references/started-games/` ni material en `references/source-assets/` para este juego: el motor se diseña desde cero y todo se dibuja con figuras vectoriales.

**Esta variante (B) es la versión con twist:** ataca de frente ese riesgo convirtiendo a los rivales en adversarios con los que se pelea, no solo obstáculos. El contacto lateral entre autos es un empujón (no un choque), las vallas de la ruta son letales para todos, y sacar a un rival contra la valla es la mayor fuente de puntos (como en Spy Hunter). Además, ir pegado detrás de un rival (rebufo) carga turbo, y durante el turbo embestir de frente a un rival lo destruye. El jugador tiene tres vidas y el combustible es una segunda condición de derrota. La variante A es la versión mínima (solo esquivar y combustible); la variante C convierte la partida en un Gran Premio por posiciones con etapas. Las tres comparten el mismo `game-id` (`carretera-neon`), así que son **mutuamente excluyentes**: se implementa solo una.

CARRETERA NEÓN **no reemplaza ningún placeholder**. El `game-planner` la anotó como "candidato a ocupar `duelo-pixel`", pero el copy de `duelo-pixel` describe un Pong ("dos paletas, una pelota") y ese Pong sigue siendo una sugerencia propia pendiente (DUELO PIXEL, 27/35). Es una fila nueva en `av_games`, sin `delete`.

## Scope

**In:**

- Entrada nueva `carretera-neon` en `av_games` (vía migración SQL), con `title: "CARRETERA NEÓN"`, categoría `VERSUS`, color `yellow`, cover `cover-carretera-neon`, y `best`/`plays` decorativos plausibles.
- Clase de cover art nueva `.cover-carretera-neon` en `app/globals.css`, diseñada con `/frontend-design`.
- Motor del juego en `components/games/carretera-neon/engine.ts`, diseñado desde cero, sin variables globales de `window`/`document`/canvas.
- Canvas lógico 800×600 (4:3): ruta vertical de 4 carriles centrada (400 px de ancho) entre dos vallas neón, con los márgenes laterales como arcén decorativo y paneles de HUD in-canvas.
- Auto del jugador con dirección continua (`←`/`→`), crucero automático, "a fondo" mientras se mantiene `↑` y turbo con `Espacio` (tap).
- Física de contacto simple: contacto lateral entre dos autos = empujón con impulso lateral; contacto frontal/trasero = choque; cruzar la valla = choque.
- Tráfico civil (más lento, cualquier contacto es choque) generado por filas que nunca bloquean los 4 carriles.
- Dos conductas de rival CPU: "bloqueador" (magenta, desde nivel 1: se cruza delante cuando lo sigues) y "embestidor" (rojo, desde nivel 3: se pone a tu lado, avisa con intermitentes 0.5 s y te empuja hacia la valla).
- Rebufo: mantenerse detrás de un rival (mismo carril, 40–160 px detrás) llena una barra; cada barra completa da una carga de turbo (máximo 3).
- Turbo (1.5 s): velocidad 720 px/s, inmune a civiles (los aparta) y embestir de frente a un rival lo destruye.
- Rival destruido (contra la valla o por turbo) suma `250 × racha`, con racha `x1`..`x4` que se reinicia al perder una vida.
- Rozón: pasar junto a un civil a menos de 12 px sin tocarlo suma 25.
- Combustible 0–100 (se ve solo in-canvas), bidones (+25) y game over inmediato si llega a 0.
- Tres vidas reales: cada choque resta una vida y reaparece al jugador en el carril libre más cercano con 2 s de invulnerabilidad.
- Nivel cada 2500 m: más tráfico, más rivales, embestidores desde nivel 3.
- HUD in-canvas (SCORE, NIVEL, VIDAS, COMBUSTIBLE, cargas de TURBO, racha `xN`) sincronizado con `.player-hud` (columna "Vidas" con corazones, sin `hudLivesLabel`).
- Componente `components/games/carretera-neon/carretera-neon-game.tsx` (`"use client"`) con `forwardRef` (`restart`, `forceGameOver`, `pressLeft(held)`, `pressRight(held)`, `pressThrottle(held)`, `pressTurbo()`) y props de callback `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.
- Controles táctiles `components/games/carretera-neon/touch-controls.tsx` (siempre renderiza; `JugarClient` lo monta en `.touch-console` con `useCoarsePointer()`), reutilizando el layout de Asteroides: `.touch-controls-move` con ◀ / ▲ "a fondo" / ▶ y `.touch-btn-fire` "TURBO", sin CSS nuevo.
- Agregar la entrada `carretera-neon` al registry existente `components/games/registry.ts`, sin `hudLivesLabel`.
- Pausa real (congela `update(dt)`, conserva el último frame) y game over real (0 vidas o 0 combustible) conectado al modal "FIN DEL JUEGO" existente.

**Out of scope (para specs futuros):**

- El resto de los juegos del catálogo no cambia su comportamiento (`asteroides`, `tetris`, `arkanoid`, `snake`, `frogger` con motor real; `gloton`, `invasores`, `duelo-pixel` con simulación falsa).
- Carrera por posiciones, etapas con meta, freno y escenarios cíclicos — son el núcleo de la variante C.
- Armas (humo, aceite, misiles de Spy Hunter) — el combate es solo por contacto.
- Vidas extra o power-ups distintos del bidón.
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
  ('carretera-neon', 'CARRETERA NEÓN', 'Pisa a fondo, esquiva el tráfico y no te quedes seco.', 'Una autopista nocturna entre vallas de neón y una banda de rivales que no juegan limpio. Empújalos contra la valla antes de que te lo hagan a ti, pégate a su rebufo para cargar el turbo y arrasa con él. Tres vidas, un tanque que se vacía y una racha que multiplica cada rival que mandas a chatarra.', 'VERSUS', 'cover-carretera-neon', 'yellow', 48720, '5.6K');
```

No hay `delete`: CARRETERA NEÓN no reemplaza ningún placeholder. `best`/`plays` son decorativos (fallback mientras `av_scores` no tenga filas para `carretera-neon`).

```ts
// components/games/carretera-neon/engine.ts
export interface EngineInput {
  keys: Record<string, boolean>; // estado sostenido, por KeyboardEvent.code
  justPressed: Record<string, boolean>; // flanco de subida, consumido por el motor
}
export type GameState = "playing" | "respawning" | "gameover";

type CarKind = "civil" | "bloqueador" | "embestidor";
interface Car {
  kind: CarKind;
  x: number; // borde izquierdo en pantalla
  y: number; // borde superior en pantalla (crece hacia abajo)
  vx: number; // velocidad lateral en px/s (dirección de IA + impulso de empujón)
  speed: number; // velocidad propia en px/s (hacia arriba del mundo)
  targetX: number; // x hacia la que conduce la IA
  reaction: number; // segundos hasta la próxima decisión de IA
  telegraph: number; // solo embestidor: segundos de intermitente antes de embestir
  wrecked: boolean; // true mientras dura su animación de chatarra (0.6 s), luego se elimina
}
interface FuelCan {
  x: number;
  y: number;
  taken: boolean;
}

export class CarreteraNeonEngine {
  score = 0; // Math.floor(distance) + KOs + rozones + bidones
  lives = 3; // va a "Vidas" en .player-hud (corazones)
  level = 1; // 1 + Math.floor(distance / 2500); va a "Nivel" en .player-hud
  state: GameState = "playing"; // "respawning" = 1 s sin auto tras un choque; no es fin de partida
  distance = 0; // metros; solo HUD in-canvas
  fuel = 100; // 0..100; solo HUD in-canvas; en 0 → "gameover"
  slipstream = 0; // 0..100; barra de rebufo
  turboCharges = 0; // 0..3
  turboTime = 0; // segundos de turbo restantes
  streak = 0; // KOs seguidos sin perder vida; mult = Math.min(4, 1 + streak)
  invulnerable = 0; // segundos restantes tras reaparecer

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // carril 2, 3 vidas, combustible 100, score 0, nivel 1, sin turbo ni racha
  forceGameOver(): void {} // state = "gameover", sin tocar el score
  update(dt: number): void {} // dt en segundos, clampeado a 0.05 por el componente
  draw(): void {} // arcén + vallas + ruta + autos + bidones + jugador + HUD (SCORE/NIVEL/VIDAS/COMB./TURBO/xN)
}
```

Geometría y constantes (px y segundos, tiempo real):

- `ROAD_X = 200`, `ROAD_W = 400`, `LANES = 4`, `LANE_W = 100`; vallas en x = 196 y x = 604 (4 px). Autos de 36×64 px; jugador en `PLAYER_Y = 470` fijo.
- `STEER_SPEED = 320` px/s, `CRUISE_SPEED = 360`, `BOOST_SPEED = 540`, `TURBO_SPEED = 720` px/s, `TURBO_TIME = 1.5` s; aceleración hacia la velocidad objetivo a 450 px/s².
- `PX_PER_METER = 10`. Civiles entre 180 y 300 px/s; rivales entre 330 y 450 px/s.
- Contacto lateral (solape vertical ≥ 50 % de la altura): ambos autos reciben `BUMP_IMPULSE = 260` px/s de `vx` en sentidos opuestos, que decae a 0 en 0.35 s; el jugador pierde el control durante ese tiempo. Contacto con solape vertical < 50 % = choque frontal/trasero.
- `RIVAL_TRIGGER = 260` px, `RIVAL_REACTION = 0.4` s (−0.04 por nivel, mínimo 0.2), `RIVAL_STEER = 150` px/s (+15 por nivel, máximo 240).
- Embestidor: cuando queda a tu lado (solape vertical ≥ 50 %, a menos de 70 px de distancia horizontal), enciende el intermitente del lado del jugador `TELEGRAPH = 0.5` s y luego acelera lateralmente a 300 px/s hacia él.
- Rebufo: `SLIPSTREAM_RATE = 45`/s mientras hay un rival en el mismo carril (±30 px de x) entre 40 y 160 px por delante; al llegar a 100 suma una carga (máximo 3) y vuelve a 0. Fuera de rebufo la barra baja a 20/s.
- `KO_POINTS = 250`, `NEAR_MISS_POINTS = 25` (una vez por civil), `CAN_POINTS = 50`.
- `FUEL_BURN_CRUISE = 1.4`/s, `FUEL_BURN_BOOST = 2.3`/s, `FUEL_BURN_TURBO = 4`/s, `FUEL_CAN = 25`, `CAN_EVERY = 650` m.
- `RESPAWN_TIME = 1` s, `INVULNERABLE_TIME = 2` s, `METERS_PER_LEVEL = 2500`.

Reglas de choque y KO:

- El jugador choca (pierde una vida) si: toca un civil sin turbo, tiene contacto frontal/trasero con un rival sin turbo, o su hitbox cruza una valla. Al chocar: `lives -= 1`, `streak = 0`, `turboTime = 0`, `state = "respawning"` durante `RESPAWN_TIME`; luego reaparece en el carril con más espacio libre, con `invulnerable = INVULNERABLE_TIME`.
- Un rival es KO si su hitbox cruza una valla, choca contra un civil o recibe contacto frontal del jugador en turbo. Si el último contacto con el jugador fue hace menos de 1.5 s (o fue por turbo), suma `KO_POINTS × Math.min(4, 1 + streak)` y luego `streak += 1`; si no, no suma.
- Durante el turbo, tocar un civil lo aparta 80 px hacia el carril vecino sin choque.
- Llegar a `lives === 0` o a `fuel <= 0` pone `state = "gameover"`.

Reglas del generador (`spawnRow`):

- Cada `ROW_EVERY` metros (arranca en 85 m, ×0.9 por nivel, mínimo 45 m) se genera una fila en `y = -80` con 1 o 2 autos en carriles distintos; nunca más de 3 carriles ocupados en una franja de 160 px.
- Un auto es rival con probabilidad `0.2 + 0.05 × (level − 1)`, máximo 0.5; desde nivel 3, un tercio de los rivales son embestidores.
- Un civil que alcanza a otro en su carril iguala su velocidad; un rival solo cambia de carril hacia un hueco libre en ±80 px.
- Los primeros 150 m de la partida y los 120 m siguientes a cada reaparición no generan autos.

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan. `components/games/registry.ts` no cambia su forma, solo recibe la entrada nueva.

## Implementation plan

1. Crear la migración `supabase/migrations/<timestamp>_add_game_carretera_neon.sql` con el `insert` de la fila `carretera-neon` del modelo de datos. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que `av_games` tiene la fila nueva y que `gloton`, `invasores` y `duelo-pixel` siguen intactos.
2. Agregar `.cover-carretera-neon` en `app/globals.css`, junto a las demás clases `.cover-*`, diseñada con `/frontend-design`: fondo nocturno `#07070f`, `::after` con una ruta en perspectiva entre dos vallas `--cyan`, líneas de carril discontinuas `--yellow` y un rival `--magenta` desviado contra la valla con chispas (`radial-gradient` `--yellow`), y `::before` con el auto del jugador en silueta `--yellow` con estela de turbo.
3. Crear `components/games/carretera-neon/engine.ts` con la base de conducción: clase `CarreteraNeonEngine`, constantes del modelo de datos, métodos privados `updatePlayer(dt)` (dirección con `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD`, "a fondo" con `ArrowUp`/`KeyW`, velocidad objetivo), `updateFuel(dt)`, `updateLevel()` y el choque contra valla. `draw()` pinta arcén y asfalto desde un canvas offscreen (dibujado una sola vez), las vallas, las líneas de carril desplazadas por `laneOffset` y el auto del jugador. En este paso el juego ya corre: cruzar una valla resta una vida y quedarse sin vidas o sin combustible termina la partida.
4. En el mismo `engine.ts`, agregar tráfico y contacto: array `cars: Car[]`, `spawnRow()` con las reglas del generador, `updateCars(dt)` (movimiento relativo, cola en carril, decaimiento de `vx`) y `resolveContacts()` (AABB; lateral → `BUMP_IMPULSE` a ambos; frontal/trasero o civil → choque del jugador). Implementar `loseLife()` con el sub-estado `"respawning"`, la búsqueda de carril libre, la invulnerabilidad parpadeante y la ventana sin spawn de 120 m.
5. En el mismo `engine.ts`, agregar la IA de rivales (`updateRivalAI(car, dt)`): "bloqueador" como en la regla de `RIVAL_TRIGGER`, "embestidor" desde nivel 3 con `telegraph` e intermitente dibujado. Agregar KO de rivales (valla, civil, turbo) con la regla de atribución de 1.5 s, `streak` y animación de chatarra de 0.6 s (rectángulo que gira y se apaga, sin partículas con `shadowBlur`).
6. En el mismo `engine.ts`, agregar rebufo (`updateSlipstream(dt)`, estela de líneas `--cyan` detrás del rival mientras carga), turbo (`Space`/`KeyX` en `justPressed` con `turboCharges > 0`, llama visible detrás del auto), rozones, bidones y el HUD in-canvas: panel izquierdo (x 0–200) con SCORE, NIVEL, VIDAS (tres autos pequeños) y racha `xN`; panel derecho (x 600–800) con el medidor de COMBUSTIBLE (`--green` → `--yellow` bajo 40 → `--magenta` parpadeante bajo 20), la barra de REBUFO y tres celdas de TURBO. Textos flotantes "+250 x2" / "+25" de 0.6 s sobre el lugar del evento. Sin overlay de "GAME OVER" propio.
7. Crear `components/games/carretera-neon/carretera-neon-game.tsx` siguiendo `asteroids-game.tsx`: constantes `WIDTH = 800`/`HEIGHT = 600` y `PREVENT_DEFAULT_CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]`, refs de último valor, canvas absoluto que llena `.crt-screen`, loop de `requestAnimationFrame` con `dt` clampeado a 0.05 (pausable con `paused`, `draw()` siempre), listeners `keydown`/`keyup` en `window` solo mientras está montado. `forwardRef` expone `restart()`, `forceGameOver()`, `pressLeft(held)` (`ArrowLeft`), `pressRight(held)` (`ArrowRight`), `pressThrottle(held)` (`ArrowUp`) y `pressTurbo()` (marca `Space` en `input.justPressed`). Diffea `score`/`lives`/`level` cada frame y dispara `onGameOver(engine.score)` solo en la transición a `"gameover"` (nunca en `"respawning"`).
8. Crear `components/games/carretera-neon/touch-controls.tsx` (sin detección de puntero, siempre renderiza), con el mismo markup que `components/games/asteroids/touch-controls.tsx`: `.touch-controls-move` con ◀ (`aria-label="Doblar a la izquierda"`), ▲ (`aria-label="Acelerar a fondo"`) y ▶ (`aria-label="Doblar a la derecha"`), los tres de "mantener" (`onPointerDown`/`onPointerUp`/`onPointerLeave`/`onPointerCancel`), y `<button className="touch-btn touch-btn-fire">` "TURBO" (`aria-label="Activar turbo"`, tap con `onPointerDown`). No se agrega CSS nuevo.
9. Agregar la entrada `"carretera-neon"` a `GAME_REGISTRY` en `components/games/registry.ts` (`Component: CarreteraNeonGame`, `TouchControls: CarreteraNeonTouchControls`, sin `hudLivesLabel`), con el mismo cast `as unknown as` que las demás entradas.
10. Recorrer manualmente con `npm run dev`: la tarjeta aparece en Inicio y Biblioteca con su cover; en `/juegos/carretera-neon/jugar` el auto avanza solo, `←`/`→` doblan, `↑` acelera a fondo; tocar de costado a un rival lo empuja y lo manda contra la valla (+250); pegarse detrás de un rival carga la barra de rebufo y da cargas de turbo; `Espacio` activa el turbo y embestir de frente destruye al rival; un civil o una valla restan una vida; desde nivel 3 aparecen embestidores con intermitente; con 0 vidas o 0 combustible se abre "FIN DEL JUEGO"; "PAUSA"/"REANUDAR"/"FIN"/"JUGAR DE NUEVO" funcionan como en Asteroides; guardar la puntuación la agrega a `av_scores`; con emulación táctil (360×640 y 390×844 vertical) aparece la consola ◀/▲/▶/TURBO bajo la pantalla. Confirmar que los demás juegos siguen igual y que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `av_games` tiene una fila `id: "carretera-neon"` con `title: "CARRETERA NEÓN"` y `cat: "VERSUS"`, y los placeholders `gloton`, `invasores` y `duelo-pixel` siguen existiendo.
- [ ] La tarjeta "CARRETERA NEÓN" aparece en `/` y `/biblioteca` con su cover propio (`cover-carretera-neon`), sin clase CSS faltante, y aparece al filtrar por `VERSUS`.
- [ ] `/juegos/carretera-neon` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `carretera-neon`.
- [ ] En `/juegos/carretera-neon/jugar` el auto avanza solo desde el primer frame, con la ruta vacía durante los primeros 150 m.
- [ ] `←`/`A` y `→`/`D` desplazan el auto; `↑`/`W` sostenido sube la velocidad y el consumo de combustible.
- [ ] El puntaje sube por metros recorridos y eventos del motor real, no por temporizador, y no sube mientras el juego está en pausa.
- [ ] Tocar de costado a un rival lo empuja en sentido contrario y empuja al jugador, sin restar vida.
- [ ] Un rival que cruza una valla hasta 1.5 s después de un contacto con el jugador explota y suma `250 × racha`; la racha sube hasta `x4` (visible in-canvas) y vuelve a `x1` al perder una vida.
- [ ] Mantenerse detrás de un rival en su carril llena la barra de rebufo; cada barra completa suma una carga de turbo, hasta 3.
- [ ] `Espacio`/`X` con cargas disponibles activa 1.5 s de turbo: la velocidad sube visiblemente, los civiles se apartan sin choque y embestir de frente a un rival lo destruye.
- [ ] Tocar un civil sin turbo, chocar de frente o de atrás con un rival sin turbo, o cruzar una valla resta exactamente una vida; el auto reaparece tras 1 s en un carril libre, parpadeando e inmune durante 2 s.
- [ ] Desde el nivel 3 aparecen rivales rojos que encienden el intermitente 0.5 s antes de empujar lateralmente al jugador.
- [ ] Pasar junto a un civil a menos de 12 px sin tocarlo suma 25 puntos, una vez por civil.
- [ ] Recoger un bidón suma 25 de combustible (sin pasar de 100) y 50 puntos.
- [ ] Cada 2500 m sube el nivel (visible en `.player-hud` y en el HUD in-canvas) y aumentan el tráfico y la proporción de rivales.
- [ ] El HUD del reproductor (`.player-hud`, "Vidas" con corazones) y el HUD in-canvas muestran siempre los mismos valores de puntaje, vidas y nivel, sin desincronizarse.
- [ ] Perder la tercera vida, o llegar a 0 de combustible con vidas restantes, abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final; el sub-estado de reaparición no lo abre.
- [ ] El botón "PAUSA" congela el juego (el loop deja de llamar `update(dt)`, conserva el último frame, no corren turbo, invulnerabilidad ni combustible) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal "FIN DEL JUEGO" con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (3 vidas, combustible 100, puntaje 0, nivel 1, sin cargas de turbo ni racha), no solo el estado visual del HUD.
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "carretera-neon", score, name }`), visible recargando `/juegos/carretera-neon` y en la tab correspondiente de `/salon-de-la-fama`.
- [ ] Con `(pointer: coarse)` aparece la consola táctil bajo la pantalla con ◀/▲/▶ (mantener, ≥ 56 px) y "TURBO" (tap, ≥ 64 px), y controlan el auto; con mouse/teclado normal no aparece.
- [ ] Salir de `/juegos/carretera-neon/jugar` no deja listeners de teclado activos en `window`.
- [ ] El resto de los juegos del catálogo siguen exactamente igual (los de motor real vía el registry y los placeholders con la simulación falsa).
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego diseñado desde cero (no hay material en `references/started-games/` ni `references/source-assets/`), retomando la sugerencia `carretera-neon` del `game-planner`. El juego lo eligió el usuario.
- **Sí:** fila nueva sin `delete` en vez de ocupar `duelo-pixel` — el copy de `duelo-pixel` promete un Pong y el `game-planner` mantiene DUELO PIXEL como sugerencia propia pendiente. Decidido por el agente game-jam — revisar.
- **Sí:** categoría `VERSUS`, color `yellow`, `best: 48720`, `plays: "5.6K"` — el combate contra rivales CPU es el centro de esta variante; `yellow` hoy solo lo usa `gloton`. Decidido por el agente game-jam — revisar.
- **Sí:** cover nuevo `.cover-carretera-neon` con `/frontend-design` — ninguna clase existente representa una ruta.
- **Sí:** contacto lateral = empujón y vallas letales para todos — convierte a cada rival en un duelo (sacarlo o que te saque), que es lo que separa este juego de un "esquiva obstáculos" `ARCADE`. Decidido por el agente game-jam — revisar.
- **Sí:** KO atribuido solo si el último contacto con el jugador fue hace menos de 1.5 s — evita puntos por rivales que chocan solos. Decidido por el agente game-jam — revisar.
- **Sí:** rebufo que carga turbo y turbo que destruye rivales de frente — premia perseguir rivales en vez de huir de ellos, con un recurso visible (3 cargas). Decidido por el agente game-jam — revisar.
- **Sí:** embestidor desde nivel 3 con intermitente de 0.5 s — el jugador aprende primero a empujar y luego a defenderse, y el aviso hace que la amenaza sea justa. Decidido por el agente game-jam — revisar.
- **Sí:** puntaje = metros + `250 × racha` por KO + 25 por rozón + 50 por bidón — el techo lo marcan los KO encadenados, lo que separa a los expertos en el leaderboard. Decidido por el agente game-jam — revisar.
- **Sí:** tres vidas reales en "Vidas" (corazones), sin `hudLivesLabel`, y combustible solo in-canvas como segunda condición de derrota — el combate por contacto produce choques frecuentes y morir al primero frustraría; el combustible mantiene la presión de Road Fighter. Decidido por el agente game-jam — revisar.
- **Sí:** sub-estado `"respawning"` de 1 s tras un choque — da una transición visible sin abrir el modal de la plataforma, mismo criterio que `"levelComplete"` en Arkanoid.
- **Sí:** táctil con el layout exacto de Asteroides (◀/▲/▶ + fuego) — mismo mapeo mental (▲ acelera, botón rojo = acción), sin CSS nuevo. Decidido por el agente game-jam — revisar.
- **Sí:** teclado con flechas y `A`/`D`/`W`; turbo en `Espacio` o `X`.
- **Sí:** `dt` variable estándar con velocidades en px/s — consistente con el resto de los motores.
- **Sí:** se agrega la entrada al registry existente (creado en SPEC 07), sin tocar `jugar-client.tsx`.
- **No:** armas de Spy Hunter (humo, aceite, misiles) — agregarían un botón más y otro sistema; el combate por contacto ya cubre el eje `VERSUS`.
- **No:** carrera por posiciones, etapas y freno — son la variante C.
- **No:** sonido, pantalla de inicio, pausa propia o récords locales — la plataforma ya los cubre.

## Risks

| Riesgo                                                                                                                                                | Mitigación                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La física de empujón por AABB puede dejar dos autos "pegados" re-disparando el impulso cada frame                                                     | Tras un contacto lateral, los dos autos se separan hasta no solaparse en el mismo frame y el par no puede volver a recibir impulso durante 0.35 s.                                                             |
| Distinguir contacto lateral de frontal por solape vertical puede sentirse arbitrario cerca del 50 %                                                   | El umbral se aplica con el solape del frame anterior al contacto (antes de separar), y el recorrido manual del paso 10 prueba toques en diagonal; el umbral es una constante (`SIDE_OVERLAP = 0.5`) ajustable. |
| Un embestidor con un civil en el carril opuesto puede crear una trampa sin salida                                                                     | El embestidor solo inicia `telegraph` si el jugador tiene al menos un carril libre en ±80 px de alto hacia el lado contrario o espacio para frenar su avance soltando `↑`.                                      |
| Dos condiciones de derrota (vidas y combustible) pueden confundir al abrir el modal                                                                   | El medidor de combustible parpadea en `--magenta` bajo 20 y muestra "¡RESERVA!" in-canvas; el modal de la plataforma no distingue causas, como Arkanoid.                                                       |
| Muchos autos, chispas y estelas pueden bajar los FPS en móvil (anti-patrón de SPEC 13)                                                               | Fondo estático en offscreen, halos pre-renderizados, sin `shadowBlur` por entidad y sin arrays nuevos por frame; se puede pasar después por `game-performance-booster`.                                         |

## Lo que **no** está en este spec

- El resto de los juegos del catálogo.
- Carrera por posiciones, etapas, freno y escenarios cíclicos (variante C).
- Armas de Spy Hunter.
- Vidas extra o power-ups distintos del bidón.
- Skins visuales.
- Sprites o imágenes externas.
- Sonido o música.
- Pantalla de inicio, pausa propia o récords en `localStorage`.
- Controles táctiles por gestos o inclinación.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
