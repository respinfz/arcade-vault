# Contrato de la plataforma para juegos con motor real

Este archivo es la referencia técnica que el skill `spec-juego` lee en la Fase 1
y vuelca (resumida, no copiada literal) en el spec que genera. Describe la API
exacta que ya existe en el código — verificada contra `components/games/asteroids/`,
`components/jugar/jugar-client.tsx`, `lib/` y `app/globals.css` — para que cada
juego nuevo la respete sin tener que releer SPEC 05 y SPEC 06 enteros.

**No es texto para copiar dentro del spec tal cual.** Es la forma que el spec
debe describir con los nombres concretos del juego que se está definiendo.

---

## Motor (`components/games/<slug>/engine.ts`)

`components/games/asteroids/engine.ts` es el modelo canónico. Un motor nuevo
respeta esta forma:

```ts
export interface EngineInput {
  keys: Record<string, boolean>; // estado sostenido, por KeyboardEvent.code
  justPressed: Record<string, boolean>; // flanco de subida, consumido por el motor
}
export type GameState = "playing" | "dead" | "gameover"; // o el enum que el juego necesite

export class XEngine {
  score = 0;
  lives = 3; // o el campo equivalente que el juego use en el HUD
  level = 1;
  state: GameState = "playing";

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: EngineInput,
  ) {}

  restart(): void {} // reset completo: entidades, score, lives, level, state
  forceGameOver(): void {} // this.state = "gameover", sin tocar el score actual
  update(dt: number): void {} // dt en segundos, clampeado (~0.05 máx)
  draw(): void {} // limpia el canvas y dibuja todo, incluido el HUD in-canvas
}
```

Reglas duras:

- **Sin `window`/`document`/canvas global.** El motor solo conoce lo que recibe
  por constructor. Las clases internas (proyectiles, entidades, partículas)
  también reciben `ctx`/`width`/`height` como parámetro, nunca leen un global.
- El estado (`score`/`lives`/`level`/`state`) se **expone como campos públicos
  y se consulta cada frame** desde React — el motor no dispara callbacks ni
  eventos.
- Se conserva el HUD in-canvas que el juego original ya dibuja (marcador,
  nivel, vidas u otro indicador equivalente) — no se duplica, se sincroniza:
  React lee los mismos campos que el motor pinta.
- Se **elimina únicamente** el overlay de fin de partida del juego original
  (el texto tipo "GAME OVER" con su propio reinicio) porque ese flujo pasa a
  manejarlo el modal "FIN DEL JUEGO" de la plataforma.
- Si el juego de referencia usa `dt` fijo por frame en vez de tiempo real
  (caso de `04-arkanoid`), el spec debe decidir explícitamente si se porta el
  `dt` variable estándar del motor (recomendado, consistente con el resto de
  la plataforma) o se preserva el paso fijo original, y decirlo en la sección
  de decisiones.

---

## Componente React (`components/games/<slug>/<slug>-game.tsx`)

Modelo: `components/games/asteroids/asteroids-game.tsx`. `"use client"`.

```ts
export interface XGameHandle {
  restart(): void;
  forceGameOver(): void;
  // + un método por cada control que el táctil necesite disparar,
  // ej. pressLeft(held), pressRight(held), pressRotate(), pressDrop()
}
export interface XGameProps {
  paused: boolean;
  onScoreChange(score: number): void;
  onLivesChange(lives: number): void; // omitir si el juego no tiene vidas
  onLevelChange(level: number): void;
  onGameOver(finalScore: number): void;
}
export const XGame = forwardRef<XGameHandle, XGameProps>(...);
```

Patrón de implementación a seguir:

- Constantes de módulo para el tamaño lógico del canvas (`WIDTH`/`HEIGHT`) y
  la lista de códigos de tecla que necesitan `preventDefault`.
- Refs de "último valor" (`pausedRef`, `onScoreChangeRef`, etc.), sincronizados
  en un `useEffect`, para que el loop de `requestAnimationFrame` nunca tenga
  que re-suscribirse.
- `useImperativeHandle` expone el handle sin dependencias (`[]`).
- Efecto de montaje único: crea el motor, siembra el HUD inicial, y corre el
  loop:
  ```ts
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  if (!pausedRef.current) engine.update(dt);
  engine.draw(); // SIEMPRE — pausa conserva el último frame dibujado
  // diffear score/lives/level contra el valor previo y disparar el callback que cambió
  if (engine.state === "gameover" && prevState !== "gameover")
    onGameOverRef.current(engine.score);
  ```
  Cleanup: `cancelAnimationFrame` + soltar la referencia al motor.
- Efecto separado para `keydown`/`keyup` en `window`, agregado y quitado solo
  mientras el componente está montado — nunca listeners persistentes.
- Render: un único `<canvas width={WIDTH} height={HEIGHT}>` con estilos
  inline `position: absolute; inset: 0; width: 100%; height: 100%; display: block`,
  para llenar `.crt-screen` (que ya tiene `aspect-ratio: 4/3` en `app/globals.css`).

---

## Controles táctiles (`components/games/<slug>/touch-controls.tsx`)

Modelo: `components/games/asteroids/touch-controls.tsx`.

```ts
export interface TouchControlsProps {
  gameRef: RefObject<XGameHandle | null>;
}
export function TouchControls({ gameRef }: TouchControlsProps) {}
```

- **`TouchControls` no detecta el tipo de puntero y siempre renderiza** sus
  botones dentro de `<div className="touch-controls">` (sin
  `useSyncExternalStore`, sin `matchMedia`, sin `return null`). La detección
  y el montaje los hace `JugarClient` (SPEC 11): con el hook compartido
  `useCoarsePointer()` (`lib/hooks/use-coarse-pointer.ts`, único lugar que
  consulta `matchMedia("(pointer: coarse)")`) agrega `av-player--touch` al
  reproductor y renderiza `<entry.TouchControls gameRef={gameRef} />` dentro
  de `.touch-console`, **debajo de `.crt`**, nunca sobre el canvas.
- `JugarClient` marca la consola `.is-inactive` (atenuada, sin
  `pointer-events`) en pausa y en "FIN DEL JUEGO", y previene scroll, zoom,
  selección y menú contextual sobre `.crt-screen` y `.touch-console`. El
  juego no tiene que hacer nada de esto.
- Clases CSS existentes en `app/globals.css` (bloque "consola táctil"), a
  reutilizar tal cual: `.touch-controls` (grid de la consola: movimiento a la
  izquierda, acción a la derecha), `.touch-controls-move` (grid de
  movimiento), `.touch-btn` (**56×56 mínimo**), `.touch-btn-fire` (acción
  principal circular, **≥ 64×64**; hoy 72×72), `.touch-btn-drop` (acción
  secundaria, en diagonal sobre la principal) y `.touch-controls-dpad`
  (cruceta de 4 direcciones centrada, sin botón de acción).
- **El orden del markup importa**: los tres botones de `.touch-controls-move`
  se posicionan por `:nth-child(1|2|3)` en el CSS existente. Si el juego
  nuevo necesita un layout distinto (p. ej. Tetris: rotar + caída rápida en
  vez de propulsar), el spec debe decidir si reutiliza esas clases con otro
  contenido o si define variantes CSS nuevas — y decirlo explícitamente, no
  asumirlo.
- Botones de "mantener presionado" usan `onPointerDown/onPointerUp/onPointerLeave/onPointerCancel`;
  botones de "tap" (disparar, soltar pieza) usan solo `onPointerDown`.
- `aria-label` en español, describiendo la acción.

---

## Punto de integración: registry (`components/games/registry.ts`)

Hoy `components/jugar/jugar-client.tsx` decide con una única línea:

```ts
const isAsteroids = game.id === "asteroides";
```

usada en cuatro lugares: el `useEffect` que corre la simulación falsa (se
salta si el juego es real), `endGame()` (llama `forceGameOver()` en vez de
`setOver(true)`), `restart()` (llama `restart()` del motor además de resetear
el estado local) y el ternario que decide qué renderizar dentro de
`.crt-screen`.

**El primer spec de juego que se implemente después de este skill** debe
introducir un registry en vez de agregar otro `if`:

```ts
// components/games/registry.ts
export interface GameHandle {
  restart(): void;
  forceGameOver(): void;
}
export interface GameRegistryEntry {
  Component: ForwardRefExoticComponent<
    {
      paused: boolean;
      onScoreChange(score: number): void;
      onLivesChange(lives: number): void;
      onLevelChange(level: number): void;
      onGameOver(finalScore: number): void;
    } & RefAttributes<GameHandle>
  >;
  TouchControls?: ComponentType<{ gameRef: RefObject<GameHandle | null> }>;
}
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  asteroides: {/* ... */},
};
```

`jugar-client.tsx` pasa a `const entry = GAME_REGISTRY[game.id]` y usa `entry`
en los cuatro puntos donde hoy usa `isAsteroids`. Los juegos sin entrada en el
registry siguen exactamente con la simulación falsa y `.game-arena` decorativo,
sin cambios. Los métodos `press*` específicos de cada juego (rotar, disparar,
soltar pieza) viven en el handle concreto de ese juego (`XGameHandle`), no en
el `GameHandle` compartido — el registry solo exige `restart`/`forceGameOver`,
que es lo único que `jugar-client.tsx` invoca de forma genérica; el
`TouchControls` de cada entrada ya conoce su propio handle concreto.

**Si `components/games/registry.ts` ya existe** (verificable en el session
context del skill, `ls components/games/`), el spec generado no vuelve a
proponer crearlo — solo agrega la entrada del juego nuevo.

---

## Catálogo y leaderboard (no se tocan)

`lib/types.ts` (`Game`, `Score`, `ScoreEntry`), `lib/supabase/queries.ts`
(`getGames`, `getGameById`, `getTopScores`, `getUserBestScore`),
`lib/actions/scores.ts` (`getScoresForGameAction`, `getUserBestScoreAction`) y
`saveScore` en `components/providers/user-provider.tsx` son genéricos desde
SPEC 06 y **no requieren ningún cambio** por agregar un juego. El leaderboard
es completamente data-driven: basta con que exista la fila en `av_games` para
que Inicio, Biblioteca, Detalle y Salón de la Fama lo muestren solos.

Formato de la migración de catálogo (tomado de
`supabase/migrations/20260922025442_av_games_av_scores.sql`, que es la única
fuente de verdad de `av_games` — no hay ruta de escritura desde la app):

```sql
insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('<id>', '<TITLE>', '<short>', '<long>', '<CAT>', 'cover-<slug>', '<color>', <best>, '<plays>');
```

Columnas: `id` (kebab-case, primary key), `title` (mayúsculas), `short`/`long`
(copy), `cat` ∈ `ARCADE|PUZZLE|SHOOTER|VERSUS`, `cover` (nombre de la clase
CSS, prefijo `cover-`), `color` ∈ `cyan|magenta|yellow|green`, `best`/`plays`
(decorativos, fallback mientras `av_scores` no tenga filas reales para ese
juego).

Si el juego nuevo reemplaza una tarjeta placeholder existente (como
`asteroides` reemplazó a `rocas` en SPEC 05), la migración también debe
`delete from av_games where id = '<id-viejo>'`.

---

## Cover art (`app/globals.css`)

Clases `.cover-<slug>` ya existentes, todas cerca de la línea 858: `.cover-bricks`,
`.cover-tetro`, `.cover-snake`, `.cover-glot`, `.cover-invaders`,
`.cover-asteroides`, `.cover-rana`, `.cover-duelo`. Patrón: `background`
degradado de base + `::after` con capas de `radial-gradient`/`linear-gradient`

- `::before` opcional con un glifo (ej. `content: "▲"`), usando las variables
  `--cyan`/`--magenta`/`--yellow`/`--green`/`--ink` ya definidas. Se consume
  como `<div className={"cover-bg " + game.cover} />` (el shell `.cover-bg`
  pone el `position: absolute; inset: 0`).

`CLAUDE.md` del repo exige usar `/frontend-design` para diseñar interfaces —
el spec generado debe indicar explícitamente que el paso de crear el cover se
apoya en esa skill.

---

## Gate de calidad

No hay test runner configurado en el repo. El criterio de aceptación final de
todo spec de juego es `npm run build` sin errores de TypeScript ni de ESLint.
El hook `PostToolUse` de `.claude/settings.json` ya corre Prettier + ESLint en
cada `Write`/`Edit` durante la implementación.
